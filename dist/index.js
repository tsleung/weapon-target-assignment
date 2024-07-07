/**
 * A simple Entity-Component-System architecture for a simulation.
 */
class EntityComponentSystem {
  /**
   * Constructs an EntityComponentSystem instance.
   */
  constructor() {
    this.entities = [];
    this.components = {};
    this.systems = [];
    this.nodeId = 0; // Helper for assigning unique IDs
  }

  /**
   * Adds a new entity to the EntityComponentSystem.
   *
   * @param {string} type The type of entity (e.g., "agent", "enemy").
   * @returns {number} The ID of the newly created entity.
   */
  addEntity(type) {
    const entity = {
      id: this.nodeId++,
      type: type,
      components: {}
    };
    this.entities.push(entity);
    return entity.id;
  }

  /**
   * Adds a new component to the EntityComponentSystem.
   *
   * @param {string} name The name of the component (e.g., "position", "weapon").
   * @param {object} data The data for the component.
   */
  addComponent(name, data) {
    if (!this.components[name]) {
      this.components[name] = {};
    }
    this.components[name][data.entityId] = data;
  }

  /**
   * Removes a component from an entity.
   *
   * @param {string} name The name of the component.
   * @param {number} entityId The ID of the entity.
   */
  removeComponent(name, entityId) {
    if (this.components[name]) {
      delete this.components[name][entityId];
    }
  }

  /**
   * Gets a component for an entity.
   *
   * @param {string} name The name of the component.
   * @param {number} entityId The ID of the entity.
   * @returns {object|undefined} The component data or undefined if not found.
   */
  getComponent(name, entityId) {
    if (this.components[name]) {
      return this.components[name][entityId];
    }
  }

  /**
   * Adds a new system to the EntityComponentSystem.
   *
   * @param {object} system The system object with an `update` function.
   */
  addSystem(system) {
    this.systems.push(system);
  }

  /**
   * Updates all systems in the EntityComponentSystem.
   */
  update() {
    this.systems.forEach(system => {
      system.update(this.entities, this.components);
    });
  }
}

// Entity types
const EntityType = {
  AGENT: "agent",
  WEAPON: "weapon",
  TARGET_PART: "target-part",
  ENEMY: "enemy"
};

// Weapon and Enemy Types 
const WeaponTypes = ["rifle", "missile", "pistol", "laser", "rocket", "repeater", "cannon", "melee"];
const EnemyTypes = ["infantry", "devastator", "tank"];

const EnemyPartsConfig = {
  "infantry": ["head", "body", "arm", "leg"],
  "tank": ["heat sink", "turret", "tread", "armor"],
  "devastator": ["heavy armor", "head"]
};

// Entity Stats
const EntityStats = {
  "agent": { "health": 100 },
  "infantry": { "health": 50 },
  "devastator": { "health": 150 },
  "tank": { "health": 200 }
};

// Weapon Stats
const WeaponStats = {
  "rifle": { "damage": 10, "accuracy": 0.8 },
  "missile": { "damage": 30, "accuracy": 0.6 },
  "pistol": { "damage": 5, "accuracy": 0.9 },
  "laser": { "damage": 15, "accuracy": 0.7 },
  "rocket": { "damage": 40, "accuracy": 0.5 },
  "repeater": { "damage": 8, "accuracy": 0.85 },
  "cannon": { "damage": 50, "accuracy": 0.4 },
  "melee": { "damage": 20, "accuracy": 1.0 } 
};

// Configurable ranges for each weapon type (in pixels)
const WeaponRangeConfig = {
  "rifle": [30, 60],
  "missile": [100, 150],
  "pistol": [10, 20],
  "laser": [50, 80],
  "rocket": [70, 120],
  "repeater": [40, 60],
  "cannon": [120, 180],
  "melee": [1, 1] 
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
  },
  "melee": {
    "primary": ["agent", "enemy", "target-part"]
  }
};

/**
 * A simple rendering system that renders entities and their components.
 */
class RenderingSystem {
  /**
   * Constructs a RenderingSystem instance.
   *
   * @param {object} svg The SVG element to render to.
   */
  constructor(svg) {
    this.svg = svg;
  }

  /**
   * Updates the rendering based on the provided entities and components.
   *
   * @param {Array<object>} entities The array of entities.
   * @param {object} components The object containing all components.
   */
  update(entities, components) {
    this.renderEntities(entities, components);
    this.renderRangeCircles(entities, components);
    this.renderTargetingLinks(components);
  }

  renderEntities(entities, components) {
    // Node selection and data join
    const nodes = this.svg.selectAll(".node")
      .data(entities, entity => entity.id)
      .join(
        enter => enter.append("circle")
          .attr("class", "node")
          .attr("r", 5)
          .style("fill", entity => {
            switch (entity.type) {
              case EntityType.AGENT: return "blue";
              case EntityType.WEAPON: return "black";
              case EntityType.TARGET_PART: return "green";
              case EntityType.ENEMY: return "red";
              default: return "#666";
            }
          }),
        update => update,
        exit => exit.remove()
      );

    // Update node positions
    nodes.attr("cx", entity => components.position[entity.id].x)
      .attr("cy", entity => components.position[entity.id].y)
      .each(function(entity) {
        const health = components.health[entity.id];
        if (health) {
          d3.select(this).append("title").text(`Health: ${health.value}`);
        }
      });
  }

  renderRangeCircles(entities, components) {
    // Ensure previous range circles are cleared before drawing new ones
    this.svg.selectAll(".range-circle").remove();

    // Draw dashed circles for agents and enemies based on their specific configurations
    entities.forEach(entity => {
      let ranges = [];

      if (entity.type === EntityType.AGENT) {
        // Assuming an agent has multiple weapons
        const weaponIds = components.weaponSlots[entity.id].weaponIds;

        // If the agent has weapons, use their ranges
        weaponIds.forEach(weaponId => {
          const weapon = components.weapon[weaponId];
          if (weapon) {
            ranges.push(...WeaponRangeConfig[weapon.weaponType] || []); // Use weapon-specific ranges, or empty if not found
          }
        });
      } else if (entity.type === EntityType.ENEMY) {
        // Use enemy-specific ranges
        ranges = EnemyRangeConfig[components.enemyType[entity.id].enemyType] || []; // Use enemy-specific ranges, or empty if not defined
      }

      // Draw circles for the specified ranges
      ranges.forEach(range => {
        this.svg.append("circle")
          .attr("cx", components.position[entity.id].x)
          .attr("cy", components.position[entity.id].y)
          .attr("r", range)
          .style("fill", "none")
          .style("stroke", entity.type === EntityType.AGENT ? "blue" : "red") // Differentiate color based on type
          .style("stroke-dasharray", "3")
          .classed("range-circle", true);
      });
    });
  }

  renderTargetingLinks(components) {
    // Render targeting
    const links = Object.values(components.targeting || {}).filter(link => link.enabled);
    links.forEach(link => {
      const source = components.position[link.source];
      const target = components.position[link.target];
      if (source && target) {
        this.svg.append("line")
          .attr("x1", source.x)
          .attr("y1", source.y)
          .attr("x2", target.x)
          .attr("y2", target.y)
          .style("stroke", link.color);
      }
    });
  }
}

/**
 * The weapon component.
 */
class WeaponComponent {
  /**
   * Constructs a WeaponComponent instance.
   *
   * @param {number} entityId The ID of the entity.
   * @param {string} weaponType The type of weapon.
   */
  constructor(entityId, weaponType) {
    this.entityId = entityId;
    this.weaponType = weaponType;
  }
}

/**
 * The weapon slots component, for managing multiple weapons on an entity.
 */
class WeaponSlotsComponent {
  /**
   * Constructs a WeaponSlotsComponent instance.
   *
   * @param {number} entityId The ID of the entity.
   * @param {number} numberOfSlots The total number of weapon slots.
   */
  constructor(entityId, numberOfSlots) {
    this.entityId = entityId;
    this.weaponIds = Array(numberOfSlots).fill(null);
  }

  /**
   * Adds a weapon to the first available slot.
   *
   * @param {number} weaponId The ID of the weapon to add.
   */
  addWeapon(weaponId) {
    for (let i = 0; i < this.weaponIds.length; i++) {
      if (this.weaponIds[i] === null) {
        this.weaponIds[i] = weaponId;
        return;
      }
    }
    console.warn("Entity has no available weapon slots.");
  }
}


/**
 * The health component.
 */
class HealthComponent {
  /**
   * Constructs a HealthComponent instance.
   *
   * @param {number} entityId The ID of the entity.
   * @param {number} value The initial health value.
   */
  constructor(entityId, value) {
    this.entityId = entityId;
    this.value = value;
  }
}

/**
 * The position component.
 */
class PositionComponent {
  /**
   * Constructs a PositionComponent instance.
   *
   * @param {number} entityId The ID of the entity.
   * @param {number} x The x-coordinate.
   * @param {number} y The y-coordinate.
   */
  constructor(entityId, x, y) {
    this.entityId = entityId;
    this.x = x;
    this.y = y;
  }
}

/**
 * The targeting component.
 */
class TargetingComponent {
  /**
   * Constructs a TargetingComponent instance.
   *
   * @param {number} source The source entity ID.
   * @param {number} target The target entity ID.
   * @param {string} color The color of the targeting line.
   * @param {boolean} enabled Whether targeting is enabled.
   */
  constructor(source, target, color, enabled) {
    this.source = source;
    this.target = target;
    this.color = color;
    this.enabled = enabled;
  }
}

/**
 * The enemy type component.
 */
class EnemyTypeComponent {
  /**
   * Constructs an EnemyTypeComponent instance.
   *
   * @param {number} entityId The ID of the entity.
   * @param {string} enemyType The type of enemy.
   */
  constructor(entityId, enemyType) {
    this.entityId = entityId;
    this.enemyType = enemyType;
  }
}

/**
 * The weapon assignment system.
 */
class WeaponAssignmentSystem {
  /**
   * Updates the weapon assignments based on target preferences and visibility.
   *
   * @param {Array<object>} entities The array of entities.
   * @param {object} components The object containing all components.
   */
  update(entities, components) {
    // Clear existing targeting links
    components.targeting = {};

    entities.forEach(entity => {
      if (entity.type === EntityType.AGENT && agentTargetingEnabled) {
        this.assignAgentWeapons(entity, components);
      } else if (entity.type === EntityType.ENEMY && enemyTargetingEnabled) {
        this.assignEnemyWeapons(entity, components);
      }
    });
  }

  /**
   * Assigns weapons for an agent entity.
   *
   * @param {object} agent The agent entity.
   * @param {object} components The object containing all components.
   */
  assignAgentWeapons(agent, components) {
    const weaponIds = components.weaponSlots[agent.id].weaponIds;
    weaponIds.forEach(weaponId => {
      if (weaponId !== null) {
        this.assignWeaponToTarget(weaponId, agent, components);
      }
    });
  }

  /**
   * Assigns weapons for an enemy entity.
   *
   * @param {object} enemy The enemy entity.
   * @param {object} components The object containing all components.
   */
  assignEnemyWeapons(enemy, components) {
    const weaponIds = components.weaponSlots[enemy.id].weaponIds;
    weaponIds.forEach(weaponId => {
      if (weaponId !== null) {
        this.assignWeaponToTarget(weaponId, enemy, components);
      }
    });
  }

  /**
   * Assigns a weapon to a target based on target preferences and range.
   *
   * @param {number} weaponId The ID of the weapon.
   * @param {object} owner The entity that owns the weapon.
   * @param {object} components The object containing all components.
   */
  assignWeaponToTarget(weaponId, owner, components) {
    const weapon = components.weapon[weaponId];
    const targetPreferences = WeaponTargetConfig[weapon.weaponType];
    if (!targetPreferences) return;

    // Find valid targets based on owner type
    let validTargetTypes = [];
    if (owner.type === EntityType.AGENT) {
      validTargetTypes = [EntityType.ENEMY, EntityType.TARGET_PART];
    } else if (owner.type === EntityType.ENEMY) {
      validTargetTypes = [EntityType.AGENT];
    }

    // Filter targetPreferences.primary to only include valid target types
    const filteredTargetTypes = targetPreferences.primary.filter(type => validTargetTypes.includes(type));

    // Find a primary target that isn't already targeted and matches preferences
    for (const targetType of filteredTargetTypes) {
      const target = entityComponentSystem.entities.find(entity => {
        return entity.type === targetType &&
          !Object.values(components.targeting).some(link => link.source === weaponId && link.target === entity.id);
      });

      if (target) {
        const sourcePosition = components.position[owner.id];
        const targetPosition = components.position[target.id];
        const distance = Math.sqrt(Math.pow(sourcePosition.x - targetPosition.x, 2) + Math.pow(sourcePosition.y - targetPosition.y, 2));
        const maxRange = WeaponRangeConfig[weapon.weaponType][1]; // Use the max range
        if (distance <= maxRange) {
          const color = getWeaponColor(weapon.weaponType);
          components.targeting[weaponId] = new TargetingComponent(weaponId, target.id, color, true);
          return;
        }
      }
    }

    // If no primary target found, check specific targets based on the weapon type
    if (targetPreferences.specificTargets) {
      for (const targetType in targetPreferences.specificTargets) {
        const specificTargets = targetPreferences.specificTargets[targetType];
        for (const specificTargetType of specificTargets) {
          const target = entityComponentSystem.entities.find(entity => { // Correctly access entities from ECS
            return entity.type === EntityType.TARGET_PART && 
                   entity.components.targetPartType && 
                   entity.components.targetPartType.partType === specificTargetType &&
                   entity.components.targetPartType.parentEntityId === targetType &&
                   !Object.values(components.targeting).some(link => link.source === weaponId && link.target === entity.id);
          });

          if (target) {
            const sourcePosition = components.position[owner.id];
            const targetPosition = components.position[target.id];
            const distance = Math.sqrt(Math.pow(sourcePosition.x - targetPosition.x, 2) + Math.pow(sourcePosition.y - targetPosition.y, 2));
            const maxRange = WeaponRangeConfig[weapon.weaponType][1]; // Use the max range
            if (distance <= maxRange) {
              const color = getWeaponColor(weapon.weaponType);
              components.targeting[weaponId] = new TargetingComponent(weaponId, target.id, color, true);
              return;
            }
          }
        }
      }
    }
  }
}

/**
 * The damage application system.
 */
class DamageSystem {
  /**
   * Applies damage to entities based on weapon assignments and hit probabilities.
   *
   * @param {Array<object>} entities The array of entities.
   * @param {object} components The object containing all components.
   */
  update(entities, components) {
    for (const weaponId in components.targeting) {
      const link = components.targeting[weaponId];
      if (link.enabled) {
        const weapon = components.weapon[weaponId];
        const target = entities.find(entity => entity.id === link.target);

        if (weapon && target) {
          const weaponStats = WeaponStats[weapon.weaponType];
          const sourcePosition = components.position[link.source];
          const targetPosition = components.position[target.id];
          const distance = Math.sqrt(Math.pow(sourcePosition.x - targetPosition.x, 2) + Math.pow(sourcePosition.y - targetPosition.y, 2));
          const maxRange = WeaponRangeConfig[weapon.weaponType][1];
          const hitProbability = this.calculateHitProbability(distance, maxRange, weaponStats.accuracy);

          if (Math.random() < hitProbability) {
            const targetHealth = components.health[target.id];
            targetHealth.value -= weaponStats.damage;
            if (targetHealth.value <= 0) {
              killEntity(target, entities, components);
            }
          }
        }
      }
    }
  }

  /**
   * Calculates the hit probability based on distance, range, and accuracy.
   *
   * @param {number} distance The distance between the attacker and target.
   * @param {number} maxRange The maximum range of the weapon.
   * @param {number} accuracy The accuracy of the weapon.
   * @returns {number} The hit probability (between 0 and 1).
   */
  calculateHitProbability(distance, maxRange, accuracy) {
    if (distance <= WeaponRangeConfig["melee"][1]) { // Melee always hits
      return 1.0;
    }
    const normalizedDistance = Math.max(0, Math.min(1, distance / maxRange));
    return (1 - normalizedDistance) * accuracy;
  }
}

/**
 * Gets the color for a specific weapon type.
 *
 * @param {string} weaponType The type of weapon.
 * @returns {string} The color string for the weapon type.
 */
function getWeaponColor(weaponType) {
  switch (weaponType) {
    case "rifle": return "red";
    case "missile": return "blue";
    case "pistol": return "green";
    case "laser": return "purple";
    case "rocket": return "orange";
    case "repeater": return "brown";
    case "cannon": return "black";
    case "melee": return "gray";
    default: return "gray";
  }
}

/**
 * Kills an entity by removing it from the entities array and its associated components.
 *
 * @param {object} entity The entity to kill.
 * @param {Array<object>} entities The array of entities.
 * @param {object} components The object containing all components.
 */
function killEntity(entity, entities, components) {
  entities.splice(entities.indexOf(entity), 1);
  for (const componentName in components) {
    if (components[componentName][entity.id]) {
      delete components[componentName][entity.id];
    }
  }
}

// API flags for toggling targeting
let enemyTargetingEnabled = true;
let agentTargetingEnabled = true;

// Set up ECS
const entityComponentSystem = new EntityComponentSystem();

// Set up weapon assignment and damage systems
const weaponAssignmentSystem = new WeaponAssignmentSystem();
entityComponentSystem.addSystem(weaponAssignmentSystem);

const damageSystem = new DamageSystem();
entityComponentSystem.addSystem(damageSystem);

// API for adding entities
const api = {
  addAgent: () => {
    const agentId = entityComponentSystem.addEntity(EntityType.AGENT);
    entityComponentSystem.addComponent("position", new PositionComponent(agentId, Math.random() * 800, Math.random() * 600));
    entityComponentSystem.addComponent("health", new HealthComponent(agentId, EntityStats.agent.health));
    entityComponentSystem.addComponent("weaponSlots", new WeaponSlotsComponent(agentId, 7)); // 7 Weapon Slots for Agents

    // Add a default weapon (rifle)
    addWeaponToEntity(agentId, "rifle");

    // Example: Add a random weapon
    const randomWeaponType = WeaponTypes[Math.floor(Math.random() * WeaponTypes.length)];
    addWeaponToEntity(agentId, randomWeaponType);
  },
  addEnemy: () => {
    const enemyTypeChoice = EnemyTypes[Math.floor(Math.random() * EnemyTypes.length)];
    const enemyId = entityComponentSystem.addEntity(EntityType.ENEMY);
    entityComponentSystem.addComponent("position", new PositionComponent(enemyId, Math.random() * 800, Math.random() * 600));
    entityComponentSystem.addComponent("health", new HealthComponent(enemyId, EntityStats[enemyTypeChoice].health));
    entityComponentSystem.addComponent("enemyType", new EnemyTypeComponent(enemyId, enemyTypeChoice));
    entityComponentSystem.addComponent("weaponSlots", new WeaponSlotsComponent(enemyId, 2)); // 2 Weapon Slots for Enemies

    // Add weapons based on enemy type, but only if there are slots available
    const weaponSlots = entityComponentSystem.getComponent("weaponSlots", enemyId);
    if (weaponSlots.weaponIds.some(id => id === null)) { // Check if any slots are empty
        addWeaponToEntity(enemyId, "laser");
    }
    if (weaponSlots.weaponIds.some(id => id === null) && enemyTypeChoice === "devastator") {
        addWeaponToEntity(enemyId, "rocket");
    }
    if (weaponSlots.weaponIds.some(id => id === null) && enemyTypeChoice === "tank") {
        addWeaponToEntity(enemyId, "cannon");
    }
    if (weaponSlots.weaponIds.some(id => id === null)) { // Check if any slots are empty
        addWeaponToEntity(enemyId, "melee");
    }

    // Add enemy parts
    const parts = EnemyPartsConfig[enemyTypeChoice] || [];
    parts.forEach(partType => {
        addTargetPartToEntity(enemyId, partType);
    });
},
  toggleEnemyTargeting: () => {
    enemyTargetingEnabled = !enemyTargetingEnabled;
    console.log("Enemy Targeting:", enemyTargetingEnabled ? "ON" : "OFF");
  },
  toggleAgentTargeting: () => {
    agentTargetingEnabled = !agentTargetingEnabled;
    console.log("Agent Targeting:", agentTargetingEnabled ? "ON" : "OFF");
  }
};

/**
 * Adds a weapon to an entity's weapon slots.
 *
 * @param {number} entityId The ID of the entity.
 * @param {string} weaponType The type of weapon to add.
 */
function addWeaponToEntity(entityId, weaponType) {
  const weaponId = entityComponentSystem.nodeId++;
  entityComponentSystem.addComponent("weapon", new WeaponComponent(weaponId, weaponType));
  const position = entityComponentSystem.getComponent("position", entityId);
  entityComponentSystem.addComponent("position", new PositionComponent(weaponId, position.x + 10, position.y + 10));
  const weaponSlots = entityComponentSystem.getComponent("weaponSlots", entityId);
  weaponSlots.addWeapon(weaponId);
}

/**
 * Adds a target part to an enemy entity.
 *
 * @param {number} enemyId The ID of the enemy entity.
 * @param {string} partType The type of part to add.
 */
function addTargetPartToEntity(enemyId, partType) {
  const partId = entityComponentSystem.nodeId++;
  entityComponentSystem.addComponent("position", new PositionComponent(partId, Math.random() * 800, Math.random() * 600));
  entityComponentSystem.addComponent("health", new HealthComponent(partId, 10)); // You can adjust the health of parts as needed
  entityComponentSystem.addComponent("targetPartType", { entityId: partId, partType: partType, parentEntityId: enemyId }); // Added target part type component
  // You can add other components specific to parts here if needed
}

// Use the API to add some entities
api.addAgent();
api.addEnemy();
api.addEnemy();
api.addEnemy();