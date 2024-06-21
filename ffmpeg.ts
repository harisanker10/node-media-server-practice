import Ffmpeg from "fluent-ffmpeg";
import { PassThrough, Readable, Stream } from "stream";

export function saveStreamLocally(stream: string, path: string) {
  Ffmpeg(stream)
    .videoCodec("libx264")
    .audioCodec("aac")
    .outputFormat("mp4")
    .outputOptions([
      "-movflags faststart", // Enable fast start for web streaming
      // "-preset veryfast", // Preset for encoding speed and compression ratio
      // "-crf 23", // Constant Rate Factor (lower means better quality)
    ])
    .outputOptions("-movflags frag_keyframe+empty_moov")
    .on("start", function (commandLine) {
      console.log("Spawned Ffmpeg with command: " + commandLine);
    })
    .on("progress", function (progress) {
      console.log({ progress });
    })
    .on("error", (err, stdout, stderr) => {
      console.error(`Error during conversion: ${err.message}`);
      console.error(`ffmpeg stdout: ${stdout}`);
      console.error(`ffmpeg stderr: ${stderr}`);
    })
    .on("end", () => {
      console.log(`Done saving locally`);
    })
    .save(path);
}

export function getMp4Stream(input: string | Readable, res: any) {
  const passThrough = new Stream.PassThrough();
  Ffmpeg(input)
    .outputOptions("-c copy")
    .videoCodec("libx264")
    .audioCodec("aac")
    .outputFormat("mp4")
    .outputOptions([
      // "-movflags faststart", // Enable fast start for web streaming
      // "-preset veryfast", // Preset for encoding speed and compression ratio
      // "-crf 0", // Constant Rate Factor (lower means better quality)
    ])
    .outputOptions("-movflags frag_keyframe+empty_moov")
    .on("start", function (commandLine) {
      console.log("Spawned Ffmpeg with command: " + commandLine);
    })
    // .on("progress", function (progress) {
    //   console.log({ progress });
    // })
    .on("error", (err, stdout, stderr) => {
      console.error(`Error during conversion: ${err.message}`);
      console.error(`ffmpeg stdout: ${stdout}`);
      console.error(`ffmpeg stderr: ${stderr}`);
    })
    .on("end", () => {
      console.log(`Done saving locally`);
    })
    .pipe(passThrough);
  return passThrough;
}

export function createPassThrough(rtmpURL: string): PassThrough {
  const passThrough = new Stream.PassThrough();
  Ffmpeg(rtmpURL)
    .outputOptions("-c copy")
    .format("mp4")
    .on("end", () => {
      console.log("Recording finished");
    })
    .on("error", (err) => {
      console.error("Error during recording:", err);
    })
    .pipe(passThrough);
  return passThrough;
}
