# Check Physics Path on your computer

The cloud workspace's localhost address is not reachable from your computer. Download and extract one of the prepared ZIP files instead. Do not open `index.html` directly: use one of the local servers below so storage and the service worker work correctly.

## Get the code from GitHub

Open https://github.com/arkadeep16121993/App_Edu/tree/mvp/physics-path and use **Code → Download ZIP**. The application is on `mvp/physics-path`; it is not on `main`. Extract the source on your Mac, install Node.js 24 LTS, then run `npm ci` and `npm run local` in the extracted folder. Alternatively use the Git clone commands in README.md to retain Git history.

Workspace paths such as `/workspace/scratch/...` are internal cloud paths and are not downloadable GitHub attachments. The earlier preview ZIPs are not published releases. You can generate a standalone guest HTML locally after `npm run build` with `python3 scripts/package-singlefile.py`; it is written to `dist/releases/physics-path-open-me.html`.

## Simplest Mac preview — no server

Download `physics-path-open-me.zip`, extract it in Finder, then double-click `Physics-Path.html`. It embeds the guest app, scripts and fonts in one file. You do not need Python, Node or a localhost link. It is a guest-only UI preview, with account and payment features off. Browser file-origin storage varies; use the server options below if the browser reports storage unavailable. The single-file bundle was checked through an HTTP harness without external asset requests; direct file navigation was blocked by the cloud browser’s administrator policy, so a Mac file-origin test has not been claimed.

## Option A — prebuilt guest preview (no npm install)

Download `physics-path-preview.zip` and extract it. You need Python 3 (available from python.org). No Cloudflare, Google or Razorpay account is needed.

- Windows: double-click `START-WINDOWS.bat`, or open a terminal in the extracted folder and run `py -3 start-preview.py`.
- macOS/Linux: open a terminal in the extracted folder and run `python3 start-preview.py`.

Your browser opens **http://localhost:8000**. Keep the terminal open; Ctrl+C stops the preview. If the browser does not open, type that address manually. If port 8000 is busy, run with `--port 8001` and use the address printed in the terminal. The preview binds only to your computer, not your home network.

This includes the built guest app, original starter questions, device history, mistake revision, offline return and feedback notes. It does **not** run the Cloudflare backend, enable accounts or take payments. The small preview server returns explicit preview-only API status; it does not simulate signed-in users or paid access.

## Option B — full source and local backend

Download `physics-path-source.zip`, extract it, and install Node.js 24 LTS from nodejs.org. Open a terminal in the extracted `physics-path` folder and run:

```sh
npm ci
npm run local
```

Once the terminal reports that the Worker is ready, open **http://localhost:8787** on your computer. The `local` command builds the client, applies local D1 migrations, then serves the frontend and Hono backend together. It needs no cloud credentials and does not deploy anything. Ctrl+C stops it. To edit the frontend with hot reload instead, use the two-terminal workflow in README.md.

If 8787 is occupied, choose a different port:

- macOS/Linux: `PHYSICS_PORT=8788 npm run local`
- Windows PowerShell: `$env:PHYSICS_PORT=8788; npm run local`

Local practice history belongs to the browser and origin. Moving between ports, the static preview and the public website does not migrate guest history.

## Send feedback

Use **Feedback** in the lower-right corner. Choose Idea, Bug, Content issue or Design; write a note and click **Save note on this device**. The report includes the current screen and question ID when applicable. Use **Download report** and attach the JSON file in this chat, along with any screenshots you want to share. No feedback is sent automatically, and no central inbox has been set up. Avoid including personal, learner or payment information. Saved notes can be deleted from the same panel.

For a useful first pass, finish a mission, try a wrong answer and a hint, reload halfway through, review mistakes, browse topics and check the mobile layout. Accounts, payments and ranked challenges remain gated.

## Share on the internet afterward

Use DEPLOYMENT.md when ready for Cloudflare. First publish the guest MVP with account and billing flags OFF. The same Feedback panel works on the public website, but testers must send their downloaded reports to you; it is not an online feedback collection service. A centralized feedback inbox can be added separately.

The full backend needs a real D1 database and an exact HTTPS origin. Account and payment providers can be connected later after their release gates pass. There is no public URL yet, and running either local option does not create one.

## Matt Pocock skills

The source ZIP includes 27 repository-local Matt Pocock skills, including `grill-me`. See [installation details](docs/matt-pocock-skills.md) for provenance and managed-plugin commands on your computer. No plugin is needed to view the website.
