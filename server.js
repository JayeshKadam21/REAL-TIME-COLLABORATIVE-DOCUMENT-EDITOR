const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const Document = require("./models/Document");
const documentRoutes = require("./routes/documentRoutes");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/collab-editor")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.use("/document", documentRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.on("connection", socket => {
  console.log("User connected");

  socket.on("get-document", async (documentId) => {
    let document = await Document.findById(documentId);

    if (!document) {
      document = await Document.create({ _id: documentId, content: "" });
    }

    socket.join(documentId);
    socket.emit("load-document", document.content);

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentId, { content: data });
    });
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));