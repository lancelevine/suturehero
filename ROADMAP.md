# SutureHero Roadmap

A living list of where SutureHero is headed. Updated as ideas are discussed.
Last updated: 2026-11-27

## Vision

**Practice. Play. Get better.** A clean, high-tech surgical skills trainer: suturing challenges, skill analytics and microsurgery training, growing over time to cover more types of surgery than just suturing.

## Short term

- **Visual overhaul (top priority):** match the "Practice. Play. Get better." mockup. Dark navy base, thin cyan glowing outlines, frosted glass panels, live stat cards, a dashed ideal suture path. Clean, high tech, cool.
- **Body sites with different skin:** presets for dermal thickness, tension and Langer's lines, tissue mechanics, curvature and backing, with site-specific scoring. Open question: fixed sites or sliders with presets.
- **Live tension heatmap** per stitch.
- **Adjustable green double Acland clamp** on the microsurgery vessel. Pushing in brings the ends closer, pushing out spreads them, which sets the tension needed to secure the knot. Default: vessel ends a little apart; the clamp is for small adjustments, not a difficulty setting.
- **Nerve repair:** align fascicles and place epineurial stitches without twist. Reuses the microsurgery scene.
- **5-minute warm-up drill** with a daily log.
- **More stitch patterns:** vertical and horizontal mattress, running, running subcuticular, each scored.
- **Self-review replay:** slow motion, orbit camera, mistakes marked on the timeline.
- **Needle arc guide:** overlay of the ideal 90 degree entry and arc that fades as you get consistent.
- **Needle loading check:** about two-thirds back, perpendicular, near the driver tip; flag bad loads.
- **Suture cutting check:** tracked scissors grade tail length, with no nick to the knot.
- **Economy of motion score:** path length, idle time and wasted moves per stitch, trended over sessions.
- **Timed challenges like Moving Target:** for example 6 sutures in 2:00 within 1.0 mm on a moving wound, with personal bests.
- **Skill tiers and unlocks:** bronze, silver and gold per skill; harder sites, microsurgery and vessel drills unlock as you go.
- **Sound design:** needle pop-through click, tension tug, timer tick, good-stitch chime.
- **Shareable highlight clips:** 15-second replay with the HUD overlaid, ready to post.
- **Guided first run:** 2-minute walkthrough of camera setup, instrument tracking check, one guided stitch and a first score.
- **Lifelike tissue rendering:** light through the skin, wet sheen, blood at punctures, edges that blanch under too much tension.
- **Live tremor meter:** instrument tip tremor gauge and per-session tremor score, mainly for microsurgery.
- **Plan vs actual:** mark planned stitch spots before closing, then overlay the plan on what you did.
- **Setup check before each session:** confirm every marker is seen by both cameras, flag poor lighting or a smudged lens, warn on calibration drift.
- **Eversion score:** after each stitch, check whether the edges are slightly everted, flat or inverted.
- **Endurance mode:** a 20 to 30 stitch incision, graphing how precision, tremor and speed drift.

## Mid term

- **Real-camera instrument tracking** with the OV9281 stereo pair.
- **Site-tuned feedback and scoring.**
- **Procedural wound variety:** lacerations, stellate wounds, ellipses with dog-ears, defects under tension.
- **Tissue handling score:** forceps crush damage from the jaw sensors.
- **Knot quality check:** square vs granny, number of throws, slippage.
- **Complication events mid-closure:** a bleeder, a torn bite, a broken needle.
- **Loupe and microscope view:** 10 to 20x, shallow depth of field, real tremor scaled up.
- **Exportable skills report:** per-session summary trended over weeks, for program directors or research.
- **Haptic cues:** vibration in instrument handles for needle pop-through, over-grip and tears.
- **Phones as cameras:** pair a phone camera by QR code; the stereo rig is the upgrade.
- **Suture material choice:** thread type and size; monofilament memory, braided drag, track marks.
- **Exam mode scored like OSATS:** timed, no hints, standard rubric.
- **Benchmarks by training level:** compare against anonymous averages for students, residents and attendings.
- **Adaptive next drill:** pick a drill that targets your weakest metric, spaced-repetition style.
- **Daily challenge:** the same wound for everyone each day, with a leaderboard.
- **Multi-layer closure:** buried deep dermal stitches first, then a skin layer; scored on whether the deep layer took tension off the skin.
- **Instrument tie speed drills:** timed knots scored on speed and on whether each is square and lies flat.

## Long term

Bigger goal: cover more types of surgery than just suturing.

- **Undermining before closure:** free the edges at the right plane and watch tension drop.
- **Full skin excision:** 3:1 ellipse along tension lines, incise, remove, undermine, close.
- **Procedures beyond skin closure:** flaps and full microsurgical anastomoses.
- **Vessel anastomosis with patency test:** release the clamp; leaks or clots show back-walled stitches or gaps.
- **Vessel size mismatch:** bigger-to-smaller pairs, wider bites on the large side, spatulation.
- **Venous coupler drill:** size the vein, evert onto the ring pins, close the device, flag missed pins.
- **Deep-cavity suturing:** a wound in a pocket or under a retracted flap, at awkward angles.
- **Ergonomics coaching:** cameras watch wrists, elbows and shoulders and nudge on posture drift.
- **Training curriculum.**
- **Left-handed mode (low priority):** mirror the scene, arc guide and scoring for left-handed surgeons.

## Maybe

- **Expert ghost replay:** follow a recorded expert's instrument motion overlaid on yours.
- **Healing time-lapse:** likely scar outcome from tension, eversion and spacing.
- **Case-based scenarios:** a patient story sets the site, wound and constraints; the trainee picks the closure and suture.
- **Sterile field score:** flag any time an instrument tip touches something outside the sterile field.
- **Closure gallery:** a top-down snapshot of each finished closure with its score and date, to see progress over time.
