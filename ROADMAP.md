# SutureHero Roadmap

A living list of where SutureHero is headed. Updated as ideas are discussed.
Last updated: 2026-11-27

## Vision

**Practice. Play. Get better.** A clean, high-tech surgical skills trainer: suturing challenges, skill analytics and microsurgery training, growing over time to cover more types of surgery than just suturing.

## Short term

- **Visual overhaul (top priority):** match the "Practice. Play. Get better." mockup. Dark navy base, thin cyan glowing outlines, frosted glass panels, live stat cards, a dashed ideal suture path. Clean, high tech, cool.
- **Body sites with different skin:** presets for dermal thickness, tension and Langer's lines, tissue mechanics, curvature and backing, with site-specific scoring. Open question: fixed sites or sliders with presets. *(First version in build 0.235: presets + sliders (Lance) for thickness, toughness and tension, with a matching skin look; Langer's lines, curvature, backing and site-specific scoring not yet.)*
- **Live tension heatmap** per stitch. *(First version in build 0.235: held strands glow by tension while tying, and each tied skin stitch gets a green/amber/red tension glow on the skin.)*
- **Adjustable green double Acland clamp** on the microsurgery vessel. Pushing in brings the ends closer, pushing out spreads them, which sets the tension needed to secure the knot. Default: vessel ends a little apart; the clamp is for small adjustments, not a difficulty setting. *(First version in build 0.235: green clamp model and a 50–150% slider that sets the vessel gap; changing it restarts the stitch rather than moving the ends live.)*
- **Vessel dilation step:** dilate each vessel end before suturing; too little narrows the lumen, too much tears the intima and raises clot risk.
- **Nerve repair:** align fascicles and place epineurial stitches without twist. Reuses the microsurgery scene. *(First version in build 0.235: random starting fascicle twist, ±10° turn buttons, aligned within 5°; stitches use the existing vessel stitch flow.)*
- **5-minute warm-up drill** with a daily log. *(First version in build 0.235: Sandbox warm-up timer, per-day log in browser storage and a streak.)*
- **More stitch patterns:** vertical and horizontal mattress, running, running subcuticular, each scored. *(First version in build 0.235: Sandbox recognises and grades vertical and horizontal mattress, running and running subcuticular from free passes. Not yet: one continuous thread through a running closure, or guided exercises for each pattern.)*
- **Corner stitch:** half-buried horizontal mattress through the tip of a V-shaped or stellate wound; scored on the tip sitting flush without being strangled.
- **Bite consistency score:** ruler overlay of each stitch's distance from the edge on both sides and spacing between stitches, outliers highlighted. *(Done in build 0.235: Sandbox summary line, red rings on outlier bites vs the median bite, and a millimetre ruler on each stitch line.)*
- **Figure-of-eight and purse-string stitches:** for fascia, bleeders and round defects; each scored on its own geometry.
- **Step-off check:** compares the height of the two wound edges at each stitch and flags any step-off from uneven bite depth. *(First version in build 0.235: per-stitch edge height difference in the closure review and Sandbox spacing line.)*
- **Back-wall catch alert:** during an anastomosis, flags any bite that catches the opposite vessel wall, on that bite rather than at the patency test. *(First version in build 0.235: live warning during a vessel bite whose arc reaches the back wall.)*
- **Stay suture planning:** pick 180 or 120 degree stays before an anastomosis; the sim marks where they go and scores how evenly the remaining bites fill the gaps. *(First version in build 0.235: choose 180° or 120° stays and see them marked on both vessel ends; scoring the fill needs multiple vessel stitches.)*
- **Vessel grasp check:** flags forceps grabs that pinch the full vessel wall instead of adventitia or lumen counterpressure.
- **Thread management scoring:** flags tangles, suture catching on instruments or dragging across the field, and pulls that saw through tissue.
- **Microsurgical bite geometry:** each vessel bite measured against wall thickness (about 2x from the edge, equal both sides, needle perpendicular to the wall).
- **Stitch order coaching:** on long or curved wounds, first stitch in the middle, then halve each gap; scores whether you followed it. *(First version in build 0.235: Sandbox summary line, straight wound.)*
- **Flip the vessel:** after the front wall, turn the double clamp 180 degrees and sew the back wall; checks the flip doesn't twist the vessel or tear stitches. *(First version in build 0.235: Turn 45° / Flip buttons turn the vessel, clamp, stay marks and saved stitches; "Save stitch & turn" keeps each tied vessel stitch. Not yet: checks that the flip doesn't twist the vessel or tear stitches.)*
- **Needle regrasp check:** grab the needle behind the tip on exit and follow its curve on pull-through; graded per bite, skin and vessel. *(First version in build 0.235: Skill Analysis counts in-tissue regrasps on the tip; following the curve not graded yet.)*
- **Knot placement check:** skin knots off the incision and on the same side each time; vessel knots outside the lumen. *(First version in build 0.235: skin knots located where the strands cross, graded off-incision and same-side in the spacing line; vessel knots not yet.)*
- **Air knot detection:** flags a first throw not snugged onto the tissue, leaving a loose loop under the knot. *(First version in build 0.235: live warning from the shared knot-engine interface (throw count and seated throws), so every engine is covered.)*
- **Bite depth gauge:** cutaway view of each bite's depth (epidermis, dermis or fat); flags too shallow or too deep. *(First version in build 0.235: Sandbox summary line per pass; cutaway view still to do.)*
- **Landmark alignment:** on wounds crossing a line like the vermilion border, brow or crease, the first stitch lines it up; scored on millimetres off. *(First version in build 0.235: separate exercise with a centred landmark line (Lance); first stitch graded within 1 mm.)*
- **Needle direction check (vessel):** outside-in on the first wall, inside-out on the second; flags any bite that goes the wrong way. *(Not started: the microsurgery stitch is one guided pass whose direction the sim sets, so there is nothing to grade until free vessel passes exist.)*
- **Running locked stitch:** blanket stitch for scalp and oozing edges; scored on even lock tension and spacing, flags strangling locks. *(Not started: needs loop topology in the thread model, i.e. knowing the needle passed through the previous loop / tying to a loop.)*
- **Pulley stitch:** far-near-near-far bite for high-tension edges; scored on bite order and tension taken off.
- **Edge presentation:** grades how forceps or a skin hook lift and evert the edge before each bite, grabbing dermis rather than pinching epidermis. *(First version in build 0.235: Skill Analysis grades the forceps hold at each needle entry; grasp layer not graded yet.)*
- **Last stitches left loose:** final two or three anastomosis stitches placed untied with loops open to see the lumen, then tied; grades order, tying before checking, and tangles.
- **Gap scan for skin:** after a closure, sweeps the wound and highlights any spot where the edges aren't touching between stitches. *(First version in build 0.235: listed in the 3-stitch closure review and marked with red bars on the wound when the session is finished, and in Sandbox once two stitches are tied.)*
- **Continuous anastomosis:** one running suture around the vessel; scored on even spacing, purse-string narrowing and slack before the final tie.
- **Subcuticular start and finish:** buried anchor knot to start, Aberdeen knot or buried exit to finish; scored on holding and staying hidden.
- **Driver grip force:** needle driver jaw sensor flags clamping hard enough to bend a fine needle or so light it spins mid-bite.
- **Instrument tip collisions:** flags driver and forceps tips bumping, crossing or blocking each other; count per closure with replay markers. *(First version in build 0.235: bump count in Skill Analysis; crossing/blocking and replay markers still to do.)*
- **Edges of unequal length:** measures both edges, shows the spacing needed to absorb the difference, and scores how evenly it was spread. *(First version in build 0.235: separate exercise with guide dots and per-gap step ratio grading; the wound geometry itself is not yet unequal.)*
- **Hand-sewn vein anastomosis:** vein mode on the vessel with a thin wall that collapses unless held open with forceps counterpressure; all vessel checks apply. *(First version in build 0.235: vein target with a thin wall that collapses unless held open; pass physics still use the round vessel.)*
- **Diseased artery mode:** stiff, plaque-lined vessel; bites must pin plaque and intima to the wall; flags separated intima. *(First version in build 0.235: plaque-lined target and coaching line; separated intima not detected yet.)*
- **Bite shape view:** cutaway of each needle path, flask-shaped vs straight or V-shaped, showing why edges evert or invert. *(First version in build 0.235: Sandbox summary classifies flask / straight / V-shaped, and the cross-section view names the planned bite's shape.)*
- **Edges of different thickness:** thick flap edge to thinner skin; coaches a deeper bite on the thin side, scored by step-off and bite depth.
- **Stitch density by tension:** reads tension along the wound first, suggests closer spacing where pull is highest, and scores whether density matched.
- **Vessel twist check:** before the first stitches, marks rotation between the two ends and flags stay sutures placed out of line.
- **Needle type and curve (upgrade the existing needle choice):** 3/8 vs 1/2 circle, cutting vs taper point; arc and tissue behavior change to match. *(First version in build 0.235: 3/8 and 1/2 circle, cutting and taper already existed; taper points now tear sooner in skin. Needle drag per point type not yet.)*
- **Tail control on pull-through:** tracks the near-side tail while drawing the suture through; flags pulling it out or leaving too much to tie.
- **Stitch angle across the wound:** draws each skin stitch's line across the wound and flags any more than a few degrees off 90. *(First version in build 0.235: Sandbox line per pass and a 10° target.)*
- **Needle pickup and transfer:** under the scope, pick up the needle with forceps, pass to the driver and load it without setting it down; times it and counts drops and re-grabs. *(First version in build 0.235: Skill Analysis drops and forceps-to-driver load time.)*
- **Tension hold on running stitches:** tracks strand tension between bites; shows earlier loops going slack or the wound bunching. *(First version in build 0.235: loops loosen when the thread is not held taut and tighten when pulled; slack loops named live.)*
- **Blind bite flag:** flags each bite where the needle tip was hidden from view as it exited. *(First version in build 0.235: Skill Analysis "Blind exits" from the 3D view camera.)*
- **Vessel eversion:** extends the eversion score to every vessel stitch, with a ring view marking any spot where an edge rolled in. *(First version in build 0.235: eversion of each saved vessel stitch, everted count and inverted stitches named; ring view still to do.)*
- **Set-back dermal stitch:** buried stitch with bites 2 to 3 mm back from the edge under the dermis; scored on set-back distance and the eversion it gives.
- **Thread budget:** each running closure starts with a fixed suture length, like an 18 inch pack; tracks thread used per stitch and flags wasteful pull-throughs. *(First version in build 0.235: Sandbox thread used vs the strand and a low-thread warning; wasteful pull-throughs not flagged yet. The running thread itself already existed since Stage B2.)*
- **One pass or two on vessel bites:** grades taking both walls in one pass vs each wall separately with a regrasp in the lumen, against vessel size.
- **Running stitch tie-off:** tie the free end to a last loop left long; checks loop size, that the knot holds without cinching the last bite, and slack along the line. *(Not started: needs loop topology in the thread model, i.e. knowing the needle passed through the previous loop / tying to a loop.)*
- **Forehand and backhand bites:** reads needle orientation in the driver against bite direction; flags awkward forehand bites where backhand would be cleaner. *(First version in build 0.235: Sandbox counts forehand (right to left) and backhand bites; flagging awkward forehand bites needs a rule for when backhand is cleaner.)*
- **Dead space check:** after closure, finds gaps between the wound floor and the stitched surface in the cutaway and points to the bites too shallow to close them.
- **Suture breaking strength:** each suture size gets a real breaking load; the thread snaps if a pull or knot throw exceeds it, with a gauge showing how close each pull came. *(First version in build 0.235: sizes 3-0 to 6-0 with relative breaking points, snapping and a peak-pull gauge while tying; real loads in kgf need a force model.)*
- **Stitch count for the vessel:** suggests a stitch count from vessel diameter and wall (about 8 for a 1 mm artery) and scores the count placed; too few leaks, too many narrows the lumen. *(First version in build 0.235: suggested count scales with circumference (8 per mm diameter, Lance); HUD goal, turn step and spacing evenness of saved stitches.)*
- **Rotate, don't push:** reads the driver's marker during each bite and scores rotation around the needle's curve versus straight pushing that widens the puncture.
- **Pull direction when tying:** reads the thread's direction as each throw snugs down and flags throws pulled along the wound or upward instead of straight across in line with the bite.
- **Sliding knot on tight wounds:** two same-way throws as a slip knot, slid down until edges just meet, then locked with a reversed throw; shows edge contact while sliding and checks it was locked.
- **Needle dulling:** the needle wears with every pass (faster for cutting points and re-bites); shows the extra force needed and suggests a fresh needle once dull.
- **Closing the wound ends:** marks each apex, checks the end stitches sit at or just past it at full depth, and shows any opening left at either end.
- **Stay tails as handles:** counts how often the vessel is turned by pulling its long stay tails versus grasping the wall; flags tail pulls hard enough to tear the bite.
- **Lumen narrowing score:** after the last vessel stitch, measures the open lumen at the join against the original vessel, shows percent narrowed and points to bites that took too much wall or cinched too tight.
- **Wrap placement in the instrument tie:** tracks where the thread wraps on the driver and how far from the wound; flags wraps that slip off or miss the short tail.
- **Overlapping edges:** checks each skin stitch for one edge riding up over the other instead of meeting it, and marks it.
- **Stray needle touches:** counts each needle contact with the vessel wall outside an intended bite, a clot risk from scratched intima, and marks them on the replay.
- **Subcuticular bite placement:** marks each new bite's entry against the last exit and dermal level; flags bites started ahead (zig-zag, gaps) or at a different level (puckering).
- **Back wall first:** for vessels that can't be flipped, the clamp locks and the far wall is sewn first from inside the lumen; grades bite order, eversion and back-wall catches from the inside view.
- **Allgöwer stitch:** half-buried vertical mattress that exits skin on one side only, keeping track marks off a flap edge; scores buried-side depth, eversion on both sides, and that the visible side stayed on the healthier edge.
- **Fragile skin mode:** thin, papery skin (elderly forearm, long steroid use) with low tear strength; narrow bites and tight knots cut through, wide bites and gentle knots are rewarded.
- **Tissue tenting before puncture:** skin dents and stretches under the needle tip as force builds, then gives with a pop; deeper tent and later pop for a dull needle, shallow angle or loose tissue.
- **Skin that relaxes under load:** viscoelastic creep so held tension fades over a minute or two; waiting after a stay pays off, and stitches tied early on a tight wound loosen a little.
- **Thread friction through the tissue:** each bite gets friction from how sharply the thread bends through it and the material (capstan effect), so tension pulled at one end fades along a running line and slack is taken up loop by loop.
- **Needle flex in tissue:** fine needles bend elastically when twisted or pushed off their curve in tissue; past a limit they stay bent, and the bent arc carries into later bites.
- **Wet thread that sticks:** a field wetness level makes 9-0 and 10-0 thread cling to the vessel, background and instrument tips and drag instead of dropping; heavier sutures barely affected.
- **Thread twist:** rotating the driver to follow the needle's curve stores twist in the thread; after several bites the slack curls into loops and kinks that snag, and the twist relaxes when the thread hangs free.
- **Needle that stays put when released:** a needle let go mid-bite is held by tissue friction and nudged by recoil; in loose tissue or a shallow bite it can slip back out.
- **Needle holes that last:** every pass leaves a puncture; clusters of holes from re-bites lower tear strength so stitches can tear through on tying, and extra vessel holes leak at the patency test.
- **Tissue that moves with the needle:** skin shifts and rolls away from the needle tip unless forceps hold the edge as countertraction; unsupported bites land off target and shallow, judged from the forceps' tracked position and jaw force.
- **Thread with weight:** loose suture hangs and drapes under gravity; a long slack strand falls across the wound where the next bite can catch the loop or the driver can trap it in a knot.
- **First throws that slip back:** on a wound under tension, a single first throw loosens when let go and the edges pull apart; a double wrap (surgeon's knot) holds by friction from wraps and thread material until the second throw locks it.
- **Edges that slide sideways:** a bite wider on one side pulls the wound line toward that side when tied, shearing the edges along the wound; over several stitches this leaves a wavy line or mismatched end, read from the needle's entry and exit points.
- **Needle tips that don't come out:** a curved needle only travels so far; on a wide bite or thick edge the tip stays buried or exits the wound floor instead of the far skin, so you re-aim or take a smaller bite.
- **Stitches that share the load:** each tied stitch carries part of the wound's pull and new neighbors take load off it; the first stitch on a tight wound eases as others go in, and stitches beside a gap carry extra and can tear through, shown on the tension heatmap.
- **Redoing a bad stitch:** cut out a placed stitch with the tracked scissors and pull the thread free; its tension releases, the edges spring apart there, and its holes stay for the replacement bite to work around.
- **Pull speed that matters:** drag on the suture rises with pull speed; quick smooth pulls are fine in skin, but fast or jerky pulls through a fine vessel wall tear the bite or snap 10-0, judged from the driver's tracked velocity.
- **Needles that skid off the skin:** a tip meeting the skin at a shallow angle slides across the surface instead of biting, then catches late and off target; a near-90 degree entry bites cleanly.
- **Stay tension that shapes the lumen:** stay suture pull changes the vessel's cross-section; taut opens a clear slit between front and back walls, slack lets them sag together so bites catch the back wall, and too hard tears bites near the stays.
- **Thread that stretches:** monofilaments stretch under load and spring back when released, so a knot snugged with the strand pulled hard sits looser after; finest sutures stretch most, set per suture type.
- **Vessel walls that ride up the needle:** a needle pushed instead of rotated, or a dull one, plows a thin vessel wall ahead of it so it bunches and folds over the tip, taking a pleat or missing the intima; forceps countertraction inside the lumen keeps the wall flat.
- **A needle fatter than its thread:** the step where thread joins the needle, and a hole cut wider than the suture, catch and drag the edge when pulled through fast or at an angle; in a vessel wall the oversized hole tears or leaks around the stitch.
- **Self-review replay:** slow motion, orbit camera, mistakes marked on the timeline. *(First version in build 0.235: replay at ½× already existed; now a timeline with the playback cursor and mistakes marked. Orbit during replay already works.)*
- **Needle arc guide:** overlay of the ideal 90 degree entry and arc that fades as you get consistent. *(First version in build 0.235: the Sandbox ideal line fades with consistent near-90°, square passes; a per-bite entry-arc overlay not yet.)*
- **Needle loading check:** about two-thirds back, perpendicular, near the driver tip; flag bad loads. *(First version in build 0.235: Skill Analysis counts driver loads within ±12% of two-thirds back; perpendicular grip not graded yet.)*
- **Suture cutting check:** tracked scissors grade tail length, with no nick to the knot. *(First version in build 0.235: tail length graded on each cut, 3–10 mm; too-close cuts already refused.)*
- **Economy of motion score:** path length, idle time and wasted moves per stitch, trended over sessions. *(First version in build 0.235: path length and idle time in Skill Analysis; wasted moves per stitch and trends not yet.)*
- **Timed challenges like Moving Target:** for example 6 sutures in 2:00 within 1.0 mm on a moving wound, with personal bests. *(First version in build 0.235: personal best times per challenge in the HUD card; moving wound not yet.)*
- **Skill tiers and unlocks:** bronze, silver and gold per skill; harder sites, microsurgery and vessel drills unlock as you go. *(First version in build 0.235: G/S/B badges for four skills in Skill Analysis; unlocks left out so nothing is hidden from trainees.)*
- **Sound design:** needle pop-through click, tension tug, timer tick, good-stitch chime. *(First version in build 0.235: synthesized pop, chime and tug cues with an on/off toggle; timer tick left out as likely annoying.)*
- **Shareable highlight clips:** 15-second replay with the HUD overlaid, ready to post.
- **Guided first run:** 2-minute walkthrough of camera setup, instrument tracking check, one guided stitch and a first score. *(First version in build 0.235: four-step card with jump buttons, once per browser; not shown to automated browser checks.)*
- **Lifelike tissue rendering:** light through the skin, wet sheen, blood at punctures, edges that blanch under too much tension. *(Started in build 0.235: blood beads at punctures and blanching around over-tight stitches; earlier builds added wet vessel highlights. Light through the skin not yet.)*
- **Live tremor meter:** instrument tip tremor gauge and per-session tremor score, mainly for microsurgery. *(First version in build 0.235: live tremor row in Skill Analysis; per-session score and microscope scaling not yet.)*
- **Plan vs actual:** mark planned stitch spots before closing, then overlay the plan on what you did. *(First version in build 0.235: click-to-plan spots with rings and a plan-vs-actual line; spots are along the wound only, bite width not planned yet.)*
- **Setup check before each session:** confirm every marker is seen by both cameras, flag poor lighting or a smudged lens, warn on calibration drift.
- **Eversion score:** after each stitch, check whether the edges are slightly everted, flat or inverted. *(Already in the app: every stitch review says edges everted / flat / inverted (`assessEdges`, src/gameplay/stitchOutcome.ts); vessel stitches too since build 0.235.)*
- **Endurance mode:** a 20 to 30 stitch incision, graphing how precision, tremor and speed drift. *(First version in build 0.235: 20-pass run with first-vs-last precision drift; a longer incision and tremor/speed graphs not yet.)*

## Mid term

- **Real-camera instrument tracking** with the OV9281 stereo pair.
- **Site-tuned feedback and scoring.**
- **Procedural wound variety:** lacerations, stellate wounds, ellipses with dog-ears, defects under tension.
- **Tissue handling score:** forceps crush damage from the jaw sensors.
- **Knot quality check:** square vs granny, number of throws, slippage.
- **Complication events mid-closure:** a bleeder, a torn bite, a broken needle.
- **Loupe and microscope view:** 10 to 20x, shallow depth of field, real tremor scaled up.
- **Exportable skills report:** per-session summary trended over weeks, for program directors or research. *(First step in build 0.235: Skill Analysis numbers in the session JSON export; weekly trends not yet.)*
- **Haptic cues:** vibration in instrument handles for needle pop-through, over-grip and tears.
- **Phones as cameras:** pair a phone camera by QR code; the stereo rig is the upgrade.
- **Suture material choice:** thread type and size; monofilament memory, braided drag, track marks.
- **Exam mode scored like OSATS:** timed, no hints, standard rubric.
- **Benchmarks by training level:** compare against anonymous averages for students, residents and attendings.
- **Adaptive next drill:** pick a drill that targets your weakest metric, spaced-repetition style.
- **Daily challenge:** the same wound for everyone each day, with a leaderboard.
- **Supermicrosurgery drill:** 0.3 to 0.8 mm vessels at lymphaticovenous anastomosis scale, 11-0 or 12-0 suture, higher magnification.
- **End-to-side anastomosis:** sew a vessel end onto a side opening in a second vessel; heel and toe first, then each side; scored on join angle and heel narrowing.
- **Multi-layer closure:** buried deep dermal stitches first, then a skin layer; scored on whether the deep layer took tension off the skin.
- **Buried knot check:** each deep dermal stitch goes deep to superficial, then superficial to deep, so the knot lands at the bottom of the wound.
- **Instrument tie speed drills:** timed knots scored on speed and on whether each is square and lies flat.
- **Layered vessel wall:** every vessel has adventitia, media and intima the needle passes through in turn; adventitia-only bites pull out on tying, and bites that miss the intima leave a flap the patency test flags.

## Long term

Bigger goal: cover more types of surgery than just suturing.

- **Undermining before closure:** free the edges at the right plane and watch tension drop.
- **Full skin excision:** 3:1 ellipse along tension lines, incise, remove, undermine, close.
- **Perforator dissection:** follow a perforator through muscle and fascia like a DIEP harvest; scored on vessel injury and motor nerve preservation.
- **Recipient vessel prep:** expose the internal mammary vessels by removing rib cartilage, separate artery and vein without tearing the vein.
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
- **Suture removal drill:** cut one side close to the skin and pull toward the wound, without dragging outside thread through the track.
- **First-pass rate:** counts how often the needle is backed out and re-bitten before a stitch is placed; first-pass percentage per closure and site.
- **Thread damaged by instruments:** clamping suture in driver or forceps jaws crimps it, severity from the jaw sensor; crimped spots are weaker and break there under load.
- **Fat that bulges into the wound:** under tension soft fat pushes up between the edges; bites that drag fat or stitches tied over it hold the dermis apart though skin looks closed, shown in the cutaway.
- **A driver that ratchets:** skin drivers lock on a ratchet and unlocking jolts the needle, which can pull it back out of a fresh bite; lock and release read from the jaw sensor; microsurgery drivers stay unlocked.
- **Square knots that turn into slip knots:** pulling one strand harder while snugging flips a square knot into a sliding half hitch that slips under load, read from per-strand tension in the knot model.
