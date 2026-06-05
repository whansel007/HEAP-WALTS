exports.translatefunc = async (origintext, targetlang) => {
    const res = await fetch("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({
            q: origintext,
            source: "auto",
            target: targetlang
        }),
        headers: { "Content-Type": "application/json" }
    });
    const resstring = await res.json();
    console.log(resstring);
    return resstring.translatedText;
}

