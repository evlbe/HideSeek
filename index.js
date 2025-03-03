const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.json({
        hey: "there",
        hey2: "there2",
    })
});
app.listen(process.env.PORT || 3000);