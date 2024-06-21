import NodeMediaServer from "node-media-server";
import Stream from "stream";
import express from "express";
import { createPassThrough, getMp4Stream, saveStreamLocally } from "./ffmpeg";
import fs from "fs";
import path from "path";
// import { config } from "./config";

const app = express();

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8000,
    mediaroot: "./media",
    allow_origin: "*",
  },
  trans: {
    ffmpeg: "/usr/bin/ffmpeg",
    tasks: [
      {
        app: "live",
        hls: true,
        hlsFlags: "[hls_time=2:hls_list_size=3:hls_flags=delete_segments]",
        dash: false,
        vc: "libx264",
        ac: "aac",
      },
    ],
  },
  fission: {
    ffmpeg: "/usr/bin/ffmpeg",
    tasks: [
      {
        rule: "game/*",
        model: [
          {
            ab: "128k",
            vb: "1500k",
            vs: "1280x720",
            vf: "30",
          },
          {
            ab: "96k",
            vb: "1000k",
            vs: "854x480",
            vf: "24",
          },
          {
            ab: "96k",
            vb: "600k",
            vs: "640x360",
            vf: "20",
          },
        ],
      },
      {
        rule: "show/*",
        model: [
          {
            ab: "128k",
            vb: "1500k",
            vs: "720x1280",
            vf: "30",
          },
          {
            ab: "96k",
            vb: "1000k",
            vs: "480x854",
            vf: "24",
          },
          {
            ab: "64k",
            vb: "600k",
            vs: "360x640",
            vf: "20",
          },
        ],
      },
    ],
  },
};

var nms = new NodeMediaServer(config);

interface streamDetails {
  StreamPath: string;
  passThrough: Stream.PassThrough;
  rtmpUrl: string;
  streamKey: string;
}

const availableStreams: Record<string, streamDetails> = {};

app.get("/streams/:id", (req, res) => {
  if (!req.params.id) {
    res.status(400).json({ message: "No stream key passed", availableStreams });
    return;
  }

  const stream = availableStreams[req.params.id];
  if (!stream) {
    res.status(404).json({ message: "stream not found", availableStreams });
    return;
  }

  res.setHeader("Content-Type", "video/mp4");
  const passThrough = getMp4Stream(stream.rtmpUrl, res);
  passThrough.pipe(res);
});

app.get("/player", (req, res) => {
  const file = path.join(__dirname, "player.html");
  res.sendFile(file);
});

nms.on("postPublish", (id, StreamPath, args) => {
  console.log(
    "\n\n",
    "[NodeEvent on postPublish] ::: Started streaming",
    "\n\n",
  );
  const streamKey = StreamPath.split("/").pop();

  if (!streamKey) {
    console.log(`couldnt parse stream key`);
    return;
  }
  const rtmpUrl = `rtmp://localhost/live/${streamKey}`;

  const passThrough = createPassThrough(rtmpUrl);
  const time = Date().split(" ")[4];
  // saveStreamLocally(rtmpUrl, `./recordings/test_${time}.mp4`);

  const stream = {
    StreamPath,
    passThrough,
    rtmpUrl,
    streamKey,
  };
  availableStreams[streamKey] = stream;
});

nms.on("donePublish", (id, StreamPath, args) => {
  console.log(
    "[NodeEvent on donePublish]",
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`,
  );
  const streamKey = StreamPath.split("/").pop();
  if (!streamKey) return;
  availableStreams[streamKey].passThrough.end();
});

nms.run();

app.listen(8888, () => console.log("client listening on 8888"));
