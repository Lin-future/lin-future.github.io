/* Recorded runs with the deployed SpatialWeave harness (evaluation set). Every fact below is copied from the
   recorded files: the run's trajectory, its tool results, the skill files it read (workspace/.agents/skills),
   and the per-question results of the other configurations (ablations, earlier evolution versions, and the
   Qwen3.8-27B, Gemma-4-31B and GPT-6 Astra runs, alone and with the harness).

   Per case: task (overview line), short (question in the player), q (full question), kind 'choice' (options,
   pick) or 'number' (num), vb / vs (base / SpatialWeave verdicts in the overview), bi (index in SW.BENCH).
   comp: the part of the harness that decides the run (k: skill | flow | tool | bad = guard).
   models: [name, alone, alone correct?, with the harness, correct?]; a number in [0, 1] = partial credit.
   without: [what was missing, what it answered, correct?] from recorded runs of the same question.
   rule: the skill lines the run read (verbatim; `x` renders as code), and how they apply here.
   diagram: the numbers each drawn diagram uses ('@walls', '@motion', '@split', '@gauge', '@route').
   photos: the input images (the thin strip under the stage).
   Per step: k, chip (label in the run chain), chips (every skill or tool the step used), media (image file,
   'a.jpg|b.jpg' for several, '@type' or '@type:phase' for a diagram), text, key (the decisive step),
   badge (stage flag), marks (recorded pixel coordinates drawn on the image; frame = region of the original). */
window.SW_RUNS = [
  {
    id: 'mc_train', dir: 'assets/cases/mc_train/', bench: 'MindCube', bi: 2, title: 'Four walls, one rule',
    thumb: '0001.jpg', calls: 0, views: 4,
    task: 'What is left of the train, from view 1?',
    short: 'Four photos circle a toy train (front, left, back, right). From view 1, what is to the train’s left?',
    q: 'Based on these four images (image 1, 2, 3, and 4) showing the toy train from different viewpoints (front, left, back, and right), with each camera aligned with room walls and partially capturing the surroundings: From the viewpoint presented in image 1, what is to the left of the toy train? A. Black table B. Printed glass door C. Wall D. Window',
    kind: 'choice', options: [['A', 'Black table'], ['B', 'Printed glass door'], ['C', 'Wall'], ['D', 'Window']], pick: { base: 'A', sw: 'C', truth: 'C' },
    vb: 'Black table', vs: 'Wall',
    comp: { k: 'skill', name: 'four-view rule', label: 'Evolved skill · four-view rule' },
    why: 'Seen from view 1, the train’s left is what view 4 shows behind it: the tiled wall, C. An evolved skill rule gives this with <b>0 tool calls</b>. Without that skill: glass door. Tools and a 1.2M-point reconstruction, no skills: black table.',
    rule: {
      file: '.agents/skills/spatial-lessons/references/four-view-direct-left-right.md', lines: 'L19–21', lab: 'The evolved rule it followed',
      text: 'Treat image numbers cyclically. From view `k`, the background scene shown by view `k-1` is on the central object\'s left and the background shown by view `k+1` is on its right, with wrap-around between views 1 and 4.',
      applied: 'View 1’s left maps to view 4 (1 − 1 wraps to 4), and view 4’s background is the tiled wall: C.'
    },
    models: [['GPT-5.6 Sol', 'A', false, 'C', true], ['Qwen3.8-27B', 'B', false, 'C', true], ['Gemma-4-31B', 'B', false, 'C', true], ['GPT-6 Astra', 'C', true, 'C', true]],
    without: [
      ['Without the evolved lessons skill', 'B · glass door', false],
      ['Tools and a 1.2M-point reconstruction, no skills', 'A · black table', false],
      ['Earlier harness versions, before this rule existed', 'D · window', false]
    ],
    photos: ['0001.jpg', '0002.jpg', '0003.jpg', '0004.jpg'],
    diagram: {
      views: [
        { n: 1, side: 'front', bg: 'Printed glass door', opt: 'B', img: '0001.jpg' },
        { n: 2, side: 'left', bg: 'Window', opt: 'D', img: '0002.jpg' },
        { n: 3, side: 'back', bg: 'Black table', opt: 'A', img: '0003.jpg' },
        { n: 4, side: 'right', bg: 'Wall', opt: 'C', img: '0004.jpg' }
      ],
      ask: { view: 1, side: 'left' }, mapped: 4, truth: 'C',
      picks: [
        { opt: 'A', who: 'Sol alone; tools, no skills' },
        { opt: 'B', who: 'Qwen, Gemma alone; rule removed' },
        { opt: 'D', who: 'earlier harness versions' }
      ]
    },
    media: {
      '0001.jpg|0002.jpg|0003.jpg|0004.jpg': 'The four input views: front, left, back and right of the toy train.',
      '@walls:rule': 'The four cameras face the train; each photo’s background is the wall opposite its camera.',
      '@walls:apply': 'The rule: from view 1, the train’s left is the background of view 1 − 1, which wraps around to view 4.',
      '@walls:answer': 'From view 1, the train’s left is what view 4 shows behind the train: the tiled wall, option C.'
    },
    alt: {
      '@walls:rule': 'Top view of the room: the train in the centre, cameras 1 to 4 at front, left, back and right, each looking across the train at the opposite wall: glass door, window, black table, tiled wall.',
      '@walls:apply': 'The same top view with a brown arc from camera 1 back to camera 4 (1 minus 1 wraps to 4) and camera 4’s line of sight across the train to the tiled wall.',
      '@walls:answer': 'From camera 1, the left arrow points to the tiled wall, the background of view 4 (1 minus 1 wraps to 4): option C. Wrong picks: A black table, B glass door, D window.'
    },
    steps: [
      { k: 'skill', label: 'Read skills', chip: 'skills', media: '@walls:rule', chips: [['skill', 'Basic'], ['skill', 'Lessons'], ['skill', 'Tools']], text: 'The evolved skill’s index sends “four ordered inward-facing views + a direct left/right question” to one rule file.' },
      { k: 'skill', key: true, label: 'Pick the rule', chip: 'four-view rule', media: '@walls:apply', chips: [['skill', 'four-view-direct-left-right.md']], text: '“The exact four-view lesson applies here … preserve image 1’s viewpoint rather than substitute the train’s intrinsic left side.”' },
      { k: 'ans', label: 'Answer', chip: 'C · wall', media: '@walls:answer', chips: [], text: 'Answers <b>C</b> with 0 tool calls: by the rule, view 1’s left is view 4’s background, the tiled wall.' }
    ]
  },
  {
    id: 'spbench_MV_297', dir: 'assets/cases/spbench_MV_297/', bench: 'SPBench MV #297', bi: 3, title: 'A reading the guard refused',
    thumb: '0007.jpg', calls: 10, views: 8,
    task: 'Door-to-telephone gap, closest points',
    short: 'Measuring from the closest point of each object, how far apart are the door and the telephone?',
    q: 'Measuring from the closest point of each object, what is the distance between the door and the telephone (in meters)?',
    kind: 'number', num: { unit: 'm', base: 0.10, sw: 0.29, truth: 0.3, baseText: '0.10 m', swText: '0.29 m', truthText: '0.3 m', swNote: 'full score', min: 0, max: 0.4, ticks: [0, 0.1, 0.2, 0.3, 0.4] },
    vb: '0.10 m', vs: '0.29 m',
    comp: { k: 'bad', name: 'near_touch_guard', label: 'Guard · near_touch_guard' },
    why: 'On whole detector boxes the door and telephone measure 0.06 m apart, under 0.4× their 0.93 m centre distance, so the guard <code class="sc-tool">near_touch_guard</code> refuses it. Re-measured between the facing edges, the closest pair is <b>0.29 m</b> (truth 0.3). The pre-guard harness answered 0.08 m.',
    rule: {
      file: '.agents/skills/spatial-tools/SKILL.md', lines: 'L40', lab: 'What the skill says after a refusal',
      text: 'On RETRY_GROUNDING, diagnostic numbers are not answer values. Use the indicated atomic fallback or one role-preserving re-grounding pass; do not loop until a preferred value appears.',
      applied: '0.06 m is not answered; one re-grounding pass, door edge to telephone cord, gives 0.31 and 0.29 m.'
    },
    models: [['GPT-5.6 Sol', '0.10', false, '0.29', true], ['Qwen3.8-27B', '0.5', false, '0.21', 0.5], ['Gemma-4-31B', '0.10', false, '0.30', true], ['GPT-6 Astra', '0.2', 0.4, '0.3', true]],
    without: [
      ['Earlier harness, before the guard existed', '0.08 m, the box reading', false],
      ['Runs of this question that called the guard (6 of 6)', 'reading refused', true]
    ],
    photos: ['0007.jpg'],
    diagram: {
      box: { cp: 0.06, center: 0.93, ratio: 0.06, threshold: 0.4 }, verdict: 'RETRY_GROUNDING',
      regrounded: [0.31, 0.29], answer: 0.29, truth: 0.3,
      line: { min: 0, max: 0.5, marks: [
        { v: 0.10, who: 'Sol alone', tone: 'base' },
        { v: 0.08, who: 'before the guard', tone: 'bad' },
        { v: 0.06, who: 'refused box reading', tone: 'refused' },
        { v: 0.29, who: 'SpatialWeave', tone: 'sw' },
        { v: 0.30, who: 'truth', tone: 'truth' }
      ] }
    },
    media: {
      '0007.jpg': 'Frame 7 of 8: the door and the wall telephone side by side.',
      'tool_04_inspect_image_crop.jpg': 'Re-grounding: anchor points on the door’s facing edge and the telephone cord (2× crop of frame 7).',
      '@gauge:measure': 'measure_pair on the two detector boxes: closest points 0.06 m, centres 0.93 m.',
      '@gauge:refuse': 'near_touch_guard: 0.06 m is under 0.4 × 0.93 m, so the reading is refused.',
      '@gauge:answer': 'Re-grounded on the facing surfaces: 0.29 m against a truth of 0.3 m.'
    },
    alt: {
      '@gauge:measure': 'Door and telephone outlines: a 0.06 m closest-point gap between their boxes, while their centres are 0.93 m apart.',
      '@gauge:refuse': 'The ratio of closest-point to centre distance is 0.06, below the guard’s 0.4 threshold, so near_touch_guard returns RETRY_GROUNDING: diagnostic, not an answer.',
      '@gauge:answer': 'Number line from 0 to 0.5 m: Sol alone 0.10, v3 before the guard 0.08, the refused reading 0.06, SpatialWeave 0.29, truth 0.30.'
    },
    steps: [
      { k: 'tool', label: 'Ground and scale', chip: 'detect_objects +3', media: '0007.jpg', chips: [['tool', 'reconstruct_scene'], ['tool', 'detect_objects'], ['tool', 'estimate_depth'], ['tool', 'inspect_image']], text: 'Detector boxes for the door (confidence 0.82) and the wall telephone (0.68) in frame 7; all eight views placed in one metric frame.' },
      { k: 'flow', label: 'Measure', chip: 'measure_pair', media: '@gauge:measure', chips: [['flow', 'measure_pair']], text: 'The workflow reads “closest point” from the wording and returns 0.06 m on the boxes, marked OK; their centres are 0.93 m apart.' },
      { k: 'bad', key: true, label: 'Guard: refuse', chip: 'near_touch_guard', badge: 'near_touch_guard → RETRY_GROUNDING', media: '@gauge:refuse', chips: [['bad', 'near_touch_guard']], text: 'A 0.06 m gap is under 0.4 × the 0.93 m centre distance, so the guard returns RETRY_GROUNDING: 0.06 m is “diagnostic, not an answer”.' },
      { k: 'flow', label: 'Re-ground once', chip: 'query_points + measure_pair ×2', media: 'tool_04_inspect_image_crop.jpg', chips: [['tool', 'query_points'], ['flow', 'measure_pair']], text: 'One re-grounding pass: points on the door’s facing edge and the telephone cord measure 0.31 m and 0.29 m; “closest point” takes the smaller.',
        marks: { frame: [580, 0, 960, 620], dots: [[750, 100], [752, 200], [755, 300], [758, 400], [761, 500], [822, 100], [840, 200], [840, 300], [842, 400], [844, 500]], lines: [{ a: [755, 300], b: [840, 300], label: '0.31 m' }, { a: [758, 400], b: [842, 400], label: '0.29 m', tone: 'ok' }] } },
      { k: 'ans', label: 'Answer', chip: '0.29 m', media: '@gauge:answer', chips: [['tool', 'answer_check']], text: '<code>answer_check</code> agrees: <b>0.29 m</b> against a truth of 0.3 m. An earlier harness without the guard answered the box reading, 0.08 m.' }
    ]
  },
  {
    id: 'mc_room', dir: 'assets/cases/mc_room/', bench: 'MindCube', bi: 2, title: 'Turned right, moved forward-left',
    thumb: '0001.jpg', calls: 3, views: 2,
    task: 'Which way did the camera move?',
    short: 'From the first view to the second, which way did I move?',
    q: 'Based on these two views showing the same scene: in which direction did I move from the first view to the second view? A. Directly left B. Diagonally forward and right C. Diagonally forward and left D. Directly right',
    kind: 'choice', options: [['A', 'Directly left'], ['B', 'Forward and right'], ['C', 'Forward and left'], ['D', 'Directly right']], pick: { base: 'B', sw: 'C', truth: 'C' },
    vb: 'Forward-right', vs: 'Forward-left',
    comp: { k: 'flow', name: 'camera_motion', label: 'Workflow · camera_motion' },
    why: 'The question asks how the camera moved, not how it turned: it moved forward-left while turning 68° right. <code class="sc-flow">camera_motion</code>, run on the reconstructed poses, reports the two separately. Without the harness, all four models answer B (forward-right), the direction it turned.',
    rule: {
      file: '.agents/skills/spatial-tools/SKILL.md', lines: 'L27', lab: 'The skill line that routed it',
      text: 'Optional executor `camera_motion`: use this when n_images >= 2; prerequisite_tools [\'reconstruct_scene\']; the quantity asked is how one camera / viewpoint moved or turned relative to another.',
      applied: 'Two views, asked how the camera moved: reconstruct first, then camera_motion. It reports the move (forward-left) apart from the turn (68° right).'
    },
    models: [['GPT-5.6 Sol', 'B', false, 'C', true], ['Qwen3.8-27B', 'B', false, 'C', true], ['Gemma-4-31B', 'B', false, 'C', true], ['GPT-6 Astra', 'B', false, 'C', true]],
    without: [
      ['Every model without the harness (Sol, Qwen, Gemma, Astra)', 'B · forward-right', false],
      ['Gemma alone: “the TV has shifted to the left … the camera must have moved to the right”', 'B', false]
    ],
    photos: ['0001.jpg', '0002.jpg'],
    diagram: {
      forward: 0.674, lateral: -1.041, bearing: -57.1, yaw: 67.5, units: 'reconstruction units',
      moveWord: 'forward-left', turnWord: 'right', orbit: false,
      options: [['A', 'directly left', -90], ['B', 'forward-right', 45], ['C', 'forward-left', -45], ['D', 'directly right', 90]],
      truth: 'C', base: 'B', baseWho: 'every model alone'
    },
    media: {
      '0001.jpg|0002.jpg': 'The two input views: the TV straight ahead, then the TV stand at the left edge.',
      '@motion:poses': 'reconstruct_scene recovers both camera poses (239,745 points), seen from above.',
      '@motion': 'camera_motion, seen from above: the move and the turn as separate fields.',
      '@motion:answer': 'The move lands in option C; the turn points toward option B.'
    },
    alt: {
      '@motion:poses': 'Top view: camera 1 at the bottom facing up; camera 2 forward and to the left, turned to the right.',
      '@motion': 'camera_motion: camera 2 moved forward-left (bearing −57°) and turned right (+68°), reported as two separate fields.',
      '@motion:answer': 'The move arrow points between forward and left: option C. The base models answered B, forward-right, the direction the camera turned.'
    },
    steps: [
      { k: 'skill', label: 'Read skills', chip: 'skills', media: '0001.jpg|0002.jpg', chips: [['skill', 'Basic'], ['skill', 'Lessons'], ['skill', 'Tools']], text: 'The tool-selection skill routes “how one camera moved or turned relative to another” to <code>camera_motion</code>, after <code>reconstruct_scene</code>.' },
      { k: 'tool', label: 'Reconstruct', chip: 'reconstruct_scene', media: '@motion:poses', chips: [['tool', 'reconstruct_scene']], text: '“I’m reconstructing the ordered pair and will read the camera translation in the first camera’s frame.”' },
      { k: 'flow', key: true, label: 'Separate move and turn', chip: 'camera_motion', media: '@motion', chips: [['flow', 'camera_motion']], text: 'Two separate fields: moved forward-left (bearing −57°), turned right (+68°). Its checks pass: a real move, not a turn in place.' },
      { k: 'ans', label: 'Answer', chip: 'C · forward-left', media: '@motion:answer', chips: [['tool', 'answer_check']], text: 'It answers from the move, not the turn: <b>C</b>. Without the harness, all four models answer B (forward-right), the direction the camera turned.' }
    ]
  },
  {
    id: 'spbench_SI_68', dir: 'assets/cases/spbench_SI_68/', bench: 'SPBench SI #68', bi: 3, title: 'Left in pixels, nearer in metres',
    thumb: '0001.jpg', calls: 4, views: 1,
    task: 'Paper bag vs. door, from the camera',
    short: 'From the camera’s perspective, is the paper bag to the door’s left, right, front, or back?',
    q: 'From the camera\'s perspective, is the paper bag to the door\'s left, right, front, or back? Options: A. left B. right C. front D. back',
    kind: 'choice', options: [['A', 'left'], ['B', 'right'], ['C', 'front'], ['D', 'back']], pick: { base: 'A', sw: 'D', truth: 'D' },
    vb: 'left', vs: 'back',
    comp: { k: 'flow', name: 'relation_readout', label: 'Workflow · relation_readout' },
    why: 'In the image, the bag is 190 px left of the door; in metres, only 0.08 m left but 1.03 m nearer the camera, which SPBench calls <b>back</b>. The evolved skill had it measure depth and <code class="sc-flow">relation_readout</code> returned the label; drop either and it answers “left”.',
    rule: {
      file: '.agents/skills/spatial-lessons/references/current-camera-depth-label.md', lines: 'L15–17', lab: 'The skill rule it read',
      text: 'In the current-camera frame, `front` follows the camera gaze into the scene: the deeper/farther target is toward front. `Back` points toward the viewer: the shallower/nearer target is toward back.',
      applied: 'The bag (1.69 m) is nearer the camera than the door (2.72 m), so it is toward back: D.'
    },
    models: [['GPT-5.6 Sol', 'A', false, 'D', true], ['Qwen3.8-27B', 'C', false, 'D', true], ['Gemma-4-31B', 'A', false, 'C', false], ['GPT-6 Astra', 'C', false, 'A', false]],
    without: [
      ['Older generic skill: workflow available, never called', 'A · left', false],
      ['Evolved skills, no relation_readout workflow (same depths)', 'A · left', false]
    ],
    photos: ['0001.jpg'],
    diagram: {
      img: '0001.jpg', size: [1296, 968],
      bag: [99, 423, 361, 769], door: [231, 0, 609, 331], px: [230, 420],
      zBag: 1.69, zDoor: 2.72, dx: -0.08, dz: -1.03, lr: 'left', fb: 'back', label: 'back', truth: 'D', base: 'A',
      note: 'SPBench’s camera axes: front = deeper along the gaze; back = nearer, toward the camera.'
    },
    media: {
      '0001.jpg': 'The input image: a paper bag near the camera, a door farther back.',
      '@split:pixels': 'In the image, the bag’s centre is 190 px left of the door’s.',
      '@split:metres': 'relation_readout, in metres: 0.08 m to the left, 1.03 m toward the camera.',
      '@split:answer': 'relation_readout’s label: back. The bag is nearer the camera than the door, “back” in SPBench’s axis names.'
    },
    alt: {
      '@split:pixels': 'The photo with the paper bag box at the lower left and the door box at the top; their centres are 190 pixels apart horizontally.',
      '@split:metres': 'Top view in metres: the door 2.72 m from the camera, the bag 1.69 m; the bag is 0.08 m to the left and 1.03 m toward the camera.',
      '@split:answer': 'relation_readout labels the relation back because the bag (1.69 m) is nearer the camera than the door (2.72 m): option D. The base model answered left from the image position.'
    },
    steps: [
      { k: 'skill', label: 'Read skills', chip: 'skills', media: '0001.jpg', chips: [['skill', 'Basic'], ['skill', 'Tools'], ['skill', 'current-camera-depth-label.md']], text: '“The paper bag is visibly left of the door, but it is also closer to the camera … rather than choosing from image position alone.”' },
      { k: 'tool', label: 'Ground and depth', chip: 'detect_objects +1', media: '@split:pixels', chips: [['tool', 'detect_objects'], ['tool', 'estimate_depth']], text: 'Boxes for the paper bag and the door (the bag’s centre is 190 px left of the door’s), and a metric depth map.' },
      { k: 'flow', key: true, label: 'Read the relation', chip: 'relation_readout', media: '@split:metres', chips: [['flow', 'relation_readout']], text: 'In metres: 0.08 m to the left, but 1.03 m toward the camera (bag 1.69 m, door 2.72 m). Label: back.' },
      { k: 'ans', label: 'Answer', chip: 'D · back', media: '@split:answer', chips: [['tool', 'answer_check']], text: '<code>relation_readout</code> labels it back, since the bag is nearer the camera than the door: <b>D</b>.' }
    ]
  },
  {
    id: 'mmsi_983', dir: 'assets/cases/mmsi_983/', bench: 'MMSI-Bench #983', bi: 6, title: 'Walking the route',
    thumb: '0001.jpg', calls: 8, views: 2,
    task: 'Upstairs is north: fireplace from the door',
    short: 'If going upstairs is north, in which direction from the door is the fireplace?',
    q: 'If the direction going upstairs is north, in which direction from the door is the fireplace? Options: A: Southwest, B: Southeast, C: Northeast, D: Northwest',
    kind: 'choice', options: [['A', 'Southwest'], ['B', 'Southeast'], ['C', 'Northeast'], ['D', 'Northwest']], pick: { base: 'A', sw: 'D', truth: 'D' },
    vb: 'Southwest', vs: 'Northwest',
    comp: { k: 'tool', name: 'turn_sequence', label: 'Tool · turn_sequence' },
    why: 'Upstairs is north. <code class="sc-tool">turn_sequence</code> walked stair bottom → stair top → door → fireplace in the 3D reconstruction; its turns (0°, −175°, +129°) sum to −46°, so the door-to-fireplace leg points 46° left of north: northwest. Without the harness, GPT-5.6 Sol and Qwen3.8-27B answered southwest.',
    rule: {
      file: '.agents/skills/spatial-tools/references/geometry-query.md', lines: 'L4–6', lab: 'The skill it read before turn_sequence',
      text: 'State the semantic roles before choosing coordinates: observer, facing, target, answer frame, and whether distance means center, ground-projected center, closest surface, or camera depth.',
      applied: 'Roles first: start at the stair bottom facing the stair top, so upstairs is north; the door-to-fireplace leg is the answer.'
    },
    models: [['GPT-5.6 Sol', 'A', false, 'D', true], ['Qwen3.8-27B', 'A', false, 'D', true], ['Gemma-4-31B', 'C', false, 'C', false], ['GPT-6 Astra', 'D', true, 'D', true]],
    without: [
      ['Gemma with the harness never called turn_sequence: “North is roughly the direction ‘into’ the scene”', 'C · northeast', false]
    ],
    photos: ['0001.jpg', '0002.jpg'],
    route: {
      legs: [{ to: 'stair top', turn: 0, len: 0.57, word: 'straight' }, { to: 'front door', turn: -175, len: 4.41, word: 'back' }, { to: 'fireplace', turn: 129, len: 4.87, word: 'right' }],
      from: 'stair bottom', net: -46
    },
    diagram: {
      legs: [{ to: 'stair top', turn: 0, len: 0.57, word: 'Straight' }, { to: 'front door', turn: -175, len: 4.41, word: 'Back' }, { to: 'fireplace', turn: 129, len: 4.87, word: 'Right' }],
      from: 'stair bottom', net: -46, tally: '0° − 175° + 129° = −46°', truth: 'D', base: 'A', answerWord: 'northwest'
    },
    media: {
      '0001.jpg|0002.jpg': 'The two input views: the staircase and fireplace, then the front door.',
      '@route:anchors': 'The landmarks placed in one frame, seen from above. Upstairs is north.',
      '@route': 'turn_sequence, seen from above: each leg and its turn.',
      '@route:answer': 'The turns sum to −46°: 46° left of north, northwest.'
    },
    alt: {
      '@route:anchors': 'Top view: stair bottom, stair top, front door and fireplace placed in one frame; north points up the stairs.',
      '@route': 'turn_sequence: straight up the stairs, back to the front door (−175°), then right to the fireplace (+129°).',
      '@route:answer': 'The turns sum to 0 − 175 + 129 = −46 degrees: 46° left of north, so the fireplace is northwest of the door, option D. The base model picked southwest, option A.'
    },
    steps: [
      { k: 'tool', label: 'Build the scene', chip: 'reconstruct_scene', media: '0001.jpg|0002.jpg', chips: [['tool', 'reconstruct_scene']], text: 'The views share a sofa, a window bank and a tall plant, so one reconstruction holds both.' },
      { k: 'tool', label: 'Ground the landmarks', chip: 'detect_objects ×2 +3', media: '@route:anchors', chips: [['tool', 'inspect_image'], ['tool', 'detect_objects'], ['tool', 'query_points']], text: 'Fireplace, staircase and front door are boxed; one stair-top point lands on a reconstruction edge, so the same tread is re-queried once.' },
      { k: 'tool', key: true, label: 'Walk the route', chip: 'turn_sequence', media: '@route', chips: [['tool', 'turn_sequence']], text: 'From the stair bottom facing up: straight (0°), back to the door (−175°), right to the fireplace (+129°).' },
      { k: 'ans', label: 'Answer', chip: 'D · northwest', media: '@route:answer', chips: [['tool', 'answer_check']], text: 'The turns sum to −46°, 46° left of north: the fireplace is northwest of the door, <b>D</b>.' }
    ]
  }
];
