async function test() {
    const start = Date.now();
    try {
        const url = 'https://torrentio.strem.fun/language=portuguese/stream/movie/tt0137523.json';
        console.log("Fetching", url);
        const res = await fetch(url);
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Time:", Date.now() - start, "ms");
        console.log("Streams count:", data.streams ? data.streams.length : 0);
    } catch (e) {
        console.error("Error", e);
    }
}
test();
