# BAUBC trailer

Every frame is rendered from HTML in headless Chromium; music and sound effects are synthesised in Python. No stock footage or samples.

| Version | Page | Render | Audio |
|---|---|---|---|
| v1 (66 s) | `trailer.html` | `node trailer/render.cjs 4` | `python3 trailer/audio.py` |
| v2 (72 s, 128 BPM) | `trailer2.html` | `node trailer/render2.cjs 4` | `python3 trailer/audio2.py` |
| v3 (92 s, 128 BPM) | `trailer3.html` (built by `python3 trailer/build3.py` from v2 + `scenes3.js`) | `node trailer/render3.cjs 4` | `python3 trailer/audio3.py` |
| v4 (88.75 s, 128 BPM) | `trailer4.html` (built by `python3 trailer/build4.py` from v3 + `scenes4.js`) | `node trailer/render4.cjs 4` | `python3 trailer/audio4.py` |

v2, v3 and v4 render at 60 fps with a 180° shutter (two sub-frames per frame, blended by ffmpeg `tmix`).

v3 and v4 use the three article cover photos in `trailer/assets/` (not committed: they belong to their owners).
Download them from the links stored in `app.posts.cover_url` as `cover1.jpg`, `cover2.jpg`, `cover3.png`.
v4 also uses real frames of BAUBC's YouTube videos in `trailer/assets/yt/` (`{id}_{frame}.jpg`, fetched from i.ytimg.com; not committed).

Mux: `ffmpeg -f concat -safe 0 -i list.txt -i audio3.wav -map 0:v -map 1:a -c:v libx264 -crf 19 -c:a aac -b:a 320k -af loudnorm=I=-12:TP=-1 out.mp4`
(`list.txt` lists `v3seg_0.mp4` … `v3seg_3.mp4`).

All people, events and numbers in the trailers are mock data (Member A…, Teacher T…, Event 1…).
