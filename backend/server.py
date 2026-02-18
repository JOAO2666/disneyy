from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from urllib.parse import quote_plus
import requests
import time
from netcine import search_link

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Type", "Content-Length", "Content-Range",
        "Accept-Ranges", "Content-Disposition",
    ],
)

TMDB_API_KEY = "35f3fea26d7c6bea37a8777ddbddbed3"
TMDB_BASE = "https://api.themoviedb.org/3"
CACHE_TTL = 3600  # 1 hora

# ─── Cache ────────────────────────────────────────────────────────────────────
_cache = {}


def cache_get(key):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    if entry:
        del _cache[key]
    return None


def cache_set(key, data):
    _cache[key] = {"data": data, "ts": time.time()}


# ─── Helpers ──────────────────────────────────────────────────────────────────
_imdb_cache = {}


def get_imdb_id(tmdb_id: str, media_type: str) -> str:
    cache_key = f"imdb:{media_type}:{tmdb_id}"
    if cache_key in _imdb_cache:
        return _imdb_cache[cache_key]

    tmdb_type = "tv" if media_type == "series" else "movie"
    url = f"{TMDB_BASE}/{tmdb_type}/{tmdb_id}/external_ids?api_key={TMDB_API_KEY}"
    try:
        resp = requests.get(url, timeout=10)
        imdb_id = resp.json().get("imdb_id", "") or ""
        _imdb_cache[cache_key] = imdb_id
        return imdb_id
    except Exception:
        return ""


def build_proxy_url(stream):
    ph = stream.get("behaviorHints", {}).get("proxyHeaders", {}).get("request", {})
    return (
        f"/api/proxy?url={quote_plus(stream['url'])}"
        f"&referer={quote_plus(ph.get('Referer', ''))}"
        f"&cookie={quote_plus(ph.get('Cookie', ''))}"
        f"&ua={quote_plus(ph.get('User-Agent', ''))}"
    )


def format_streams(raw_streams):
    result = []
    for s in raw_streams:
        result.append({
            "url": build_proxy_url(s),
            "name": s.get("name", "SKYFLIX"),
            "description": s.get("description", ""),
            "lang": "dub" if "dublado" in s.get("description", "").lower() else "leg",
        })
    return result


# ─── Stream endpoints ─────────────────────────────────────────────────────────
@app.get("/api/streams/{media_type}/{tmdb_id}")
def get_streams(media_type: str, tmdb_id: str):
    cache_key = f"streams:{media_type}:{tmdb_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    imdb_id = get_imdb_id(tmdb_id, media_type)
    if not imdb_id:
        return {"streams": [], "error": "IMDb ID não encontrado"}

    raw = search_link(imdb_id)
    result = {"streams": format_streams(raw), "imdb_id": imdb_id}
    cache_set(cache_key, result)
    return result


@app.get("/api/streams/{media_type}/{tmdb_id}/{season}/{episode}")
def get_series_streams(media_type: str, tmdb_id: str, season: str, episode: str):
    cache_key = f"streams:{media_type}:{tmdb_id}:{season}:{episode}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    imdb_id = get_imdb_id(tmdb_id, media_type)
    if not imdb_id:
        return {"streams": [], "error": "IMDb ID não encontrado"}

    raw = search_link(f"{imdb_id}:{season}:{episode}")
    result = {"streams": format_streams(raw), "imdb_id": imdb_id}
    cache_set(cache_key, result)
    return result


# ─── TMDB metadata endpoints ─────────────────────────────────────────────────
@app.get("/api/episodes/{tmdb_id}/{season}")
def get_episodes(tmdb_id: str, season: str):
    url = f"{TMDB_BASE}/tv/{tmdb_id}/season/{season}?api_key={TMDB_API_KEY}&language=pt-BR"
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        episodes = [{
            "episode_number": ep["episode_number"],
            "name": ep.get("name", f"Episódio {ep['episode_number']}"),
            "overview": ep.get("overview", ""),
            "still_path": ep.get("still_path", ""),
        } for ep in data.get("episodes", [])]
        return {"episodes": episodes, "season_number": data.get("season_number", season)}
    except Exception:
        return {"episodes": [], "error": "Falha ao buscar episódios"}


@app.get("/api/seasons/{tmdb_id}")
def get_seasons(tmdb_id: str):
    url = f"{TMDB_BASE}/tv/{tmdb_id}?api_key={TMDB_API_KEY}&language=pt-BR"
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        seasons = [{
            "season_number": s["season_number"],
            "name": s.get("name", f"Temporada {s['season_number']}"),
            "episode_count": s.get("episode_count", 0),
        } for s in data.get("seasons", []) if s["season_number"] > 0]
        return {"seasons": seasons, "name": data.get("name", "")}
    except Exception:
        return {"seasons": [], "error": "Falha ao buscar temporadas"}


# ─── Video proxy ──────────────────────────────────────────────────────────────
def _build_upstream_headers(ua: str, referer: str, cookie: str) -> dict:
    headers = {
        "User-Agent": ua or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    if referer:
        headers["Referer"] = referer
    if cookie:
        headers["Cookie"] = cookie
    return headers


@app.head("/api/proxy")
async def proxy_head(
    request: Request,
    url: str = Query(...),
    referer: str = Query(""),
    cookie: str = Query(""),
    ua: str = Query(""),
):
    headers = _build_upstream_headers(ua, referer, cookie)
    try:
        resp = requests.head(url, headers=headers, timeout=15, allow_redirects=True)
        return Response(
            content=b"",
            status_code=200,
            headers={
                "Content-Type": resp.headers.get("Content-Type", "video/mp4"),
                "Content-Length": resp.headers.get("Content-Length", "0"),
                "Accept-Ranges": "bytes",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except Exception:
        return Response(content=b"", status_code=200, headers={
            "Accept-Ranges": "bytes",
            "Content-Type": "video/mp4",
            "Access-Control-Allow-Origin": "*",
        })


@app.get("/api/proxy")
async def proxy_stream(
    request: Request,
    url: str = Query(...),
    referer: str = Query(""),
    cookie: str = Query(""),
    ua: str = Query(""),
):
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    headers = _build_upstream_headers(ua, referer, cookie)

    range_header = request.headers.get("range")
    if range_header:
        headers["Range"] = range_header

    try:
        resp = requests.get(url, headers=headers, stream=True, timeout=30, allow_redirects=True)

        response_headers = {
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
        }
        cl = resp.headers.get("Content-Length")
        cr = resp.headers.get("Content-Range")
        if cl:
            response_headers["Content-Length"] = cl
        if cr:
            response_headers["Content-Range"] = cr

        return StreamingResponse(
            resp.iter_content(chunk_size=512 * 1024),
            status_code=resp.status_code,
            media_type=resp.headers.get("Content-Type", "video/mp4"),
            headers=response_headers,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
