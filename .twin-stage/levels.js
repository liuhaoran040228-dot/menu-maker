  const levels = [
    {
      walls: [],
      platforms: [{ x: 400, y: 420, w: 200, h: 20 }, { x: 800, y: 420, w: 200, h: 20 }],
      springs: [],
      movingPlatforms: [],
      mechanisms: {},
      gems: [
        { x: 200, y: 480, color: 'ice' },
        { x: 600, y: 380, color: 'ice' },
        { x: 1000, y: 480, color: 'fire' },
        { x: 300, y: 350, color: 'fire' },
        { x: 700, y: 300, color: 'ice' },
        { x: 900, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [{ x: 350, y: 420, w: 250, h: 20 }, { x: 750, y: 420, w: 250, h: 20 }],
      springs: [],
      movingPlatforms: [],
      mechanisms: {
        bridge: { x: 400, y: 520, w: 70, h: 20, type: 'freeze', triggered: false, actor: null }
      },
      pools: [{ x: 380, y: 510, w: 70, h: 30, type: 'water', frozen: false }],
      gems: [
        { x: 150, y: 480, color: 'ice' },
        { x: 500, y: 350, color: 'ice' },
        { x: 1050, y: 480, color: 'fire' },
        { x: 700, y: 300, color: 'fire' },
        { x: 400, y: 250, color: 'ice' },
        { x: 950, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [{ x: 580, y: 400, w: 40, h: 120, melted: false }],
      platforms: [{ x: 300, y: 420, w: 200, h: 20 }, { x: 800, y: 420, w: 200, h: 20 }],
      springs: [],
      movingPlatforms: [],
      mechanisms: {},
      gems: [
        { x: 200, y: 480, color: 'ice' },
        { x: 650, y: 350, color: 'ice' },
        { x: 1000, y: 480, color: 'fire' },
        { x: 400, y: 300, color: 'fire' },
        { x: 750, y: 250, color: 'ice' },
        { x: 900, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [{ x: 580, y: 400, w: 40, h: 120, melted: false }],
      platforms: [
        { x: 250, y: 420, w: 150, h: 20 },
        { x: 850, y: 420, w: 150, h: 20 }
      ],
      springs: [],
      movingPlatforms: [],
      mechanisms: {
        pressurePlate: { x: 300, y: 500, w: 80, h: 20, triggered: false, actors: [] },
        returnSwitch: { x: 720, y: 500, w: 80, h: 20, triggered: false, actors: [] }
      },
      gems: [
        { x: 150, y: 480, color: 'ice' },
        { x: 500, y: 300, color: 'ice' },
        { x: 1050, y: 480, color: 'fire' },
        { x: 700, y: 350, color: 'fire' },
        { x: 400, y: 250, color: 'ice' },
        { x: 950, y: 300, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [
        { x: 100, y: 480, w: 120, h: 20 },
        { x: 400, y: 380, w: 150, h: 20 },
        { x: 750, y: 300, w: 150, h: 20 },
        { x: 1000, y: 420, w: 120, h: 20 }
      ],
      springs: [],
      movingPlatforms: [],
      mechanisms: {},
      gems: [
        { x: 200, y: 450, color: 'ice' },
        { x: 500, y: 330, color: 'ice' },
        { x: 900, y: 250, color: 'fire' },
        { x: 300, y: 250, color: 'fire' },
        { x: 650, y: 200, color: 'ice' },
        { x: 1050, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [
        { x: 200, y: 420, w: 120, h: 20 },
        { x: 550, y: 320, w: 120, h: 20 },
        { x: 900, y: 420, w: 120, h: 20 }
      ],
      springs: [],
      movingPlatforms: [],
      mechanisms: {
        timedWall: { x: 580, y: 400, w: 40, h: 120, active: false, duration: 8, elapsed: 0, lever: { x: 460, y: 500, w: 60, h: 20 } }
      },
      gems: [
        { x: 150, y: 480, color: 'ice' },
        { x: 600, y: 250, color: 'ice' },
        { x: 1050, y: 480, color: 'fire' },
        { x: 350, y: 300, color: 'fire' },
        { x: 750, y: 200, color: 'ice' },
        { x: 950, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [
        { x: 150, y: 480, w: 100, h: 20 },
        { x: 500, y: 380, w: 200, h: 20 },
        { x: 950, y: 480, w: 100, h: 20 }
      ],
      springs: [],
      movingPlatforms: [
        { x: 600, y: 360, w: 80, h: 20, minX: 450, maxX: 750, speed: 100, dir: 1, carryActor: null }
      ],
      mechanisms: {},
      gems: [
        { x: 200, y: 450, color: 'ice' },
        { x: 550, y: 320, color: 'ice' },
        { x: 1000, y: 450, color: 'fire' },
        { x: 450, y: 280, color: 'fire' },
        { x: 700, y: 250, color: 'ice' },
        { x: 850, y: 300, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [
        { x: 100, y: 480, w: 120, h: 20 },
        { x: 500, y: 380, w: 100, h: 20 },
        { x: 950, y: 480, w: 120, h: 20 }
      ],
      springs: [{ x: 500, y: 350, power: -1200 }],
      movingPlatforms: [],
      mechanisms: {},
      gems: [
        { x: 150, y: 450, color: 'ice' },
        { x: 550, y: 300, color: 'ice' },
        { x: 1000, y: 450, color: 'fire' },
        { x: 400, y: 250, color: 'fire' },
        { x: 750, y: 200, color: 'ice' },
        { x: 900, y: 300, color: 'fire' }
      ]
    },
    {
      walls: [{ x: 580, y: 400, w: 40, h: 120, melted: false }],
      platforms: [
        { x: 250, y: 420, w: 150, h: 20 },
        { x: 400, y: 380, w: 120, h: 20 },
        { x: 850, y: 420, w: 150, h: 20 }
      ],
      springs: [],
      movingPlatforms: [],
      mechanisms: {
        bridge: { x: 400, y: 520, w: 70, h: 20, type: 'freeze', triggered: false, actor: null },
        pressurePlate: { x: 300, y: 500, w: 80, h: 20, triggered: false, actors: [] }
      },
      pools: [{ x: 380, y: 510, w: 70, h: 30, type: 'water', frozen: false }],
      gems: [
        { x: 200, y: 480, color: 'ice' },
        { x: 500, y: 320, color: 'ice' },
        { x: 1000, y: 480, color: 'fire' },
        { x: 650, y: 300, color: 'fire' },
        { x: 400, y: 250, color: 'ice' },
        { x: 900, y: 350, color: 'fire' }
      ]
    },
    {
      walls: [],
      platforms: [
        { x: 200, y: 480, w: 120, h: 20 },
        { x: 900, y: 480, w: 120, h: 20 }
      ],
      springs: [],
      movingPlatforms: [],
      mechanisms: {
        shieldPedestal: [
          { x: 350, y: 460, charged: false, type: 'ice' },
          { x: 850, y: 460, charged: false, type: 'fire' }
        ],
        shield: { x: 1100, y: 380, w: 40, h: 80, active: true }
      },
      gems: [
        { x: 150, y: 450, color: 'ice' },
        { x: 500, y: 400, color: 'ice' },
        { x: 1050, y: 450, color: 'fire' },
        { x: 700, y: 400, color: 'fire' },
        { x: 400, y: 300, color: 'ice' },
        { x: 950, y: 300, color: 'fire' }
      ]
    }
  ];

