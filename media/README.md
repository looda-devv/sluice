# Media

| File | Use |
| --- | --- |
| `sluice-demo.mp4` | 1920×1080, 48s, ~3.2 MB — the master. LinkedIn, X, YouTube. |
| `sluice-demo-720p.mp4` | 1280×720, ~1.4 MB — where upload size is capped. |
| `sluice-demo.gif` | 800px, 6s, ~1.9 MB — the opening national view only, for places that want a GIF. |
| `social-captions.md` | Long-form, thread and short captions. |

The recording is silent and has no narration, so it needs captions or
surrounding copy on any feed that autoplays muted.

## How it was made

Scripted with Puppeteer against the deployed site rather than a local dev
server, so what it shows is what a visitor gets. Frames are captured one at a
time at 15 fps with eased programmatic scrolling — a screen recorder would have
produced juddery scrolling and an inconsistent frame rate.

Frames are JPEG, not PNG: at 1080p the PNG encode dominated capture time at
roughly 0.7s a frame, and the source goes into a lossy video regardless.

The encode forces `yuv420p` at limited range and tags BT.709 explicitly.
Straight from JPEG frames ffmpeg produces `yuvj420p` (full range), which some
players stretch — enough to wash out a dark interface like this one.

`scripts/record.mjs` is not kept in the repo; the recording setup lives outside
it. The storyboard was: national headline → IWA balance → province ranking →
why the index beats the percentage → Northern Cape (including its flagged data
problem) → all 144 municipalities, filtered live → the night-flow method →
reservoir drawdown → back to national.
