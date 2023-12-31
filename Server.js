const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const CrashBetRoutes = require("./Routes/route");
app.use("/api/v1", CrashBetRoutes);

app.listen(3002, () => {
  console.log("listening at port 3002");
});

