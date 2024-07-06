// Simulation data structures
let nodes = []; // Stores all entities
let links = []; // Stores relationships
let nodeId = 0; // Helper to assign unique IDs

// Entity types
const EntityType = {
  AGENT: "agent",
  WEAPON: "weapon",
  TARGET_PART: "target-part",
  ENEMY: "enemy"
};

// Weapon and Enemy Types (for demonstration)
const WeaponTypes = ["rifle", "missile", "pistol", "laser", "rocket", "repeater", "cannon"];
const EnemyTypes = ["infantry", "devastator", "tank"];

const EnemyPartsConfig = {
  "infantry": ["head", "body", "arm", "leg"],
  "tank": ["heat sink", "turret", "tread", "armor"],
  "devastator": ["heavy armor", "head"]
};

// Configurable ranges for each weapon type (in pixels)
const WeaponRangeConfig = {
  "rifle": [30, 60],
  "missile": [100, 150],
  "pistol": [10, 20],
  "laser": [50, 80],
  "rocket": [70, 120],
  "repeater": [40, 60],
  "cannon": [120, 180]
};

// Configurable ranges for each enemy type (in pixels)
const EnemyRangeConfig = {
  "infantry": [25, 50],
  "devastator": [40, 80],
  "tank": [60, 120]
};

const WeaponTargetConfig = {
  "rifle": {
    "primary": ["devastator", "infantry"],
    "specificTargets": {
      "tank": ["heat sink"]
    }
  },
  "missile": {
    "primary": ["tank", "devastator"]
  },
  "pistol": {
    "primary": ["infantry"]
  },
  "laser": {
    "primary": ["infantry", "devastator"],
    "specificTargets": {
      "tank": ["turret"]
    }
  },
  "rocket": {
    "primary": ["tank"],
    "specificTargets": {
      "devastator": ["heavy armor"]
    }
  },
  "repeater": {
    "primary": ["infantry", "devastator"]
  },
  "cannon": {
    "primary": ["tank"]
  }
};

// Adds an Agent
function addAgent() {
  const agent = { id: nodeId++, type: EntityType.AGENT, x: Math.random() * 800, y: Math.random() * 600, weaponSlots: Array(7).fill(null) }; // 7 empty weapon slots
  nodes.push(agent);
}

function addAgentWithWeapon() {
  // Add agent
  const agent = { id: nodeId++, type: EntityType.AGENT, x: Math.random() * 800, y: Math.random() * 600, weaponSlots: Array(7).fill(null) };
  nodes.push(agent);

  // Add one weapon
  const weaponType = WeaponTypes[Math.floor(Math.random() * WeaponTypes.length)];
  const weapon = { id: nodeId++, type: EntityType.WEAPON, weaponType, x: agent.x + 10, y: agent.y + 10, agentId: agent.id };
  nodes.push(weapon);
  links.push({ source: agent.id, target: weapon.id });
  agent.weaponSlots[0] = weapon.id; // Assign weapon to the first slot
}

// Adds a Weapon assigned to an Agent
function addWeapon(agentId, weaponType) {
  const agentIndex = nodes.findIndex(node => node.id === agentId && node.type === EntityType.AGENT);
  if (agentIndex !== -1) {
    const agent = nodes[agentIndex];
    for (let i = 0; i < agent.weaponSlots.length; i++) {
      if (agent.weaponSlots[i] === null) {
        const weapon = { id: nodeId++, type: EntityType.WEAPON, weaponType, x: agent.x + 10, y: agent.y + 10 };
        nodes.push(weapon);
        links.push({ source: agentId, target: weapon.id });
        agent.weaponSlots[i] = weapon.id;
        return; // Stop after assigning to the first available slot
      }
    }
    // If no slots are available, log a message or handle it appropriately
    console.warn("Agent has no available weapon slots.");
  }
}

// Adds an Enemy
function addEnemy(enemyType) {
  const enemy = { id: nodeId++, type: EntityType.ENEMY, enemyType, x: Math.random() * 800, y: Math.random() * 600 };
  nodes.push(enemy);
}

function addEnemyWithParts(enemyType) {
  const enemy = { id: nodeId++, type: EntityType.ENEMY, enemyType, x: Math.random() * 800, y: Math.random() * 600 };
  nodes.push(enemy);

  const parts = EnemyPartsConfig[enemyType] || [];
  parts.forEach(partType => {
    const part = { id: nodeId++, enemyId: enemy.id, type: EntityType.TARGET_PART, partType, x: enemy.x + Math.random() * 20 - 10, y: enemy.y + Math.random() * 20 - 10 };
    nodes.push(part);
  });
}

// Adds a Target Part to an Enemy
function addTargetPart(enemyId, partType) {
  const enemyIndex = nodes.findIndex(node => node.id === enemyId && node.type === EntityType.ENEMY);
  if (enemyIndex !== -1) {
    const targetPart = { id: nodeId++, type: EntityType.TARGET_PART, partType, x: nodes[enemyIndex].x - 10, y: nodes[enemyIndex].y - 10 };
    nodes.push(targetPart);
    links.push({ source: enemyId, target: targetPart.id });
  }
}

// Weapon Assignments
function assignWeaponsToTargets() {
  const weaponAssignments = []; // Store assignments for visualization

  nodes.filter(node => node.type === EntityType.WEAPON).forEach(weapon => {
    const targetPreferences = WeaponTargetConfig[weapon.weaponType];
    if (!targetPreferences) return;

    // Find a primary target that isn't already targeted and matches preferences
    for (const targetType of targetPreferences.primary) {
      const target = nodes.find(node => {
        return node.type === EntityType.ENEMY && node.enemyType === targetType &&
               !links.some(link => link.source === weapon.id && link.target === node.id);
      });

      if (target) {
        links.push({ source: weapon.id, target: target.id });
        weaponAssignments.push({ source: weapon.id, target: target.id, color: getWeaponColor(weapon.weaponType) }); // Store assignment
        return; // Stop searching if a target is found
      }
    }

    // If specific targets are defined, attempt to match by part
    if (targetPreferences.specificTargets) {
      Object.entries(targetPreferences.specificTargets).forEach(([enemyType, parts]) => {
        parts.forEach(part => {
          const targetPart = nodes.find(node =>
            node.type === EntityType.TARGET_PART &&
            node.partType === part &&
            nodes.some(enemy => enemy.id === node.enemyId && enemy.enemyType === enemyType && !links.some(link => link.source === weapon.id && link.target === node.id))
          );

          if (targetPart) {
            links.push({ source: weapon.id, target: targetPart.id });
            weaponAssignments.push({ source: weapon.id, target: targetPart.id, color: getWeaponColor(weapon.weaponType) }); // Store assignment
          }
        });
      });
    }
  });

  return weaponAssignments;
}

function getWeaponColor(weaponType) {
  // Simple color mapping for weapon types
  switch (weaponType) {
    case "rifle": return "red";
    case "missile": return "blue";
    case "pistol": return "green";
    case "laser": return "purple";
    case "rocket": return "orange";
    case "repeater": return "brown";
    case "cannon": return "black";
    default: return "gray";
  }
}

const { interval } = rxjs; // Assume RxJS is globally available
const simulationUpdates = interval(1000); // Adjust time as needed

const api = {
  addAgent: () => {
    addAgentWithWeapon();
  },
  addEnemy: () => {
    const enemyTypeChoice = EnemyTypes[Math.floor(Math.random() * EnemyTypes.length)];
    addEnemyWithParts(enemyTypeChoice);
  }
};

simulationUpdates.subscribe(() => {
  updateSimulation();
});

function updateSimulation() {
  svg.selectAll(".range-circle").remove();

  nodes.forEach(node => {
    let ranges = [];

    if (node.type === EntityType.AGENT) {
      const weapon = nodes.find(n => n.agentId === node.id && n.type === EntityType.WEAPON);
      if (weapon) {
        ranges = WeaponRangeConfig[weapon.weaponType] || [];
      }
    } else if (node.type === EntityType.ENEMY) {
      ranges = EnemyRangeConfig[node.enemyType] || [];
    }

    ranges.forEach(range => {
      svg.append("circle")
        .attr("cx", node.x)
        .attr("cy", node.y)
        .attr("r", range)
        .style("fill", "none")
        .style("stroke", node.type === EntityType.AGENT ? "blue" : "red")
        .style("stroke-dasharray", "3")
        .classed("range-circle", true);
    });
  });

  // Node selection and data join
  const node = svg.selectAll(".node")
    .data(nodes, d => d.id)
    .join(enter => enter.append("circle")
      .attr("class", "node")
      .attr("r", 5)
      .style("fill", d => {
        switch (d.type) {
          case EntityType.AGENT: return "blue";
          case EntityType.WEAPON: return "black";
          case EntityType.TARGET_PART: return "green";
          case EntityType.ENEMY: return "red";
          default: return "#666";
        }
      }),
      update => update,
      exit => exit.remove());

  // Update node positions
  node.attr("cx", d => d.x)
    .attr("cy", d => d.y);

  // Link selection and data join
  const link = svg.selectAll(".link")
    .data(links, d => `${d.source}-${d.target}`)
    .join("line")
    .classed("link", true)
    .style("stroke", d => {
      const assignments = assignWeaponsToTargets(); // Get assignments for coloring
      const assignment = assignments.find(a => a.source === d.source && a.target === d.target);
      return assignment ? assignment.color : "#aaa"; // Use weapon color if assigned
    })
    .attr("x1", d => nodes.find(n => n.id === d.source).x)
    .attr("y1", d => nodes.find(n => n.id === d.source).y)
    .attr("x2", d => nodes.find(n => n.id === d.target).x)
    .attr("y2", d => nodes.find(n => n.id === d.target).y);
}