import conditions from '../actions/conditions';
import menus from '../actions/menus';
import { addOperation, setConfig, isWorking } from '../gui/Queue';

export function loadAction(script, config, callback) {
    if (isWorking()) return callback(false);
    setConfig(config, callback);
    for (let container in script) {
        if (script[container].context != "DEFAULT") {
            addOperation({ type: 'returnToEditActions' });
            addOperation({ type: 'closeGui' });
            switch (script[container].context) {
                case "FUNCTION":
                    addOperation({ type: 'chat', text: `/function edit ${script[container].contextTarget.name}`, func: script[container].contextTarget.name, command: true });
                    break;
                case "EVENT":
                    addOperation({ type: 'chat', text: `/eventactions`, command: true });
                    addOperation({ type: 'option', option: script[container].contextTarget.name });
                    break;
                case "COMMAND":
                    addOperation({ type: 'chat', text: `/customcommands`, command: true });
                    addOperation({ type: 'option', option: script[container].contextTarget.name.startsWith("/") ? script[container].contextTarget.name : "/" + script[container].contextTarget.name });
                    break;
                case "NPC":
                    addOperation({ type: 'goto', name: script[container].contextTarget.name });
                    addOperation({ type: 'click', slot: 12 });
                    break;
                case "BUTTON":
                    addOperation({ type: 'goto', name: script[container].contextTarget.name });
                    break;
                case "PAD":
                    addOperation({ type: 'goto', name: script[container].contextTarget.name });
                    break;
            }
        }

        let instructions = actionList(script[container].start, script[container].target, false);
        let instructionsFromNew = actionList([], script[container].target, false);

        if(instructionsFromNew.length < instructions.length) instructions = instructionsFromNew;

        // ChatLib.chat("&6Length&f: " + instructions.length);
        // ChatLib.chat("&6Length From New&f: " + instructionsFromNew.length);

        for(let instruction of instructions) {
            addOperation(instruction);
        }

    }

    addOperation({ type: 'done' });
}

function action(start, target, useConditions) {

    if(start.type === "EXIT" && target.type === "EXIT") return [];

    let editInstructions = [];
    let settings = (useConditions) ? conditions[target.type] : menus[target.type];

    let keys = Object.keys(target);
    for(let key in start) {
        if(!keys.includes(key)) keys.push(key);
    }
        
    for (let key of keys) {

        if (key == "type") continue;
        let setting = settings[key];
        if (start[key] == null) start[key] = setting.default_value;
        if (target[key] == null) target[key] = setting.default_value;
        if (JSON.stringify(start[key]).toLowerCase() == JSON.stringify(target[key]).toLowerCase()) continue;
        
        editInstructions.push({ type: 'click', slot: setting.slot });
        switch (setting.type) {
            case "chat_input":
                editInstructions.push({ type: 'chat', text: target[key] });
                break;
            case "anvil_input":
                editInstructions.push({ type: 'anvil', text: target[key] });
                break;
            case "conditions":
                editInstructions.push(...actionList(start[key], target[key], true));
                break;
            case "static_option_select":
                // Static option select is for Hypixel made options, which will be uppercase for the first character
                editInstructions.push({ type: 'option', option: setting.options.find(n => n.toLowerCase() == target[key].replace("_", " ").toLowerCase()) });
                break;
            case "dynamic_option_select":
                editInstructions.push({ type: 'option', option: target[key] });
                break;
            case "location":
                editInstructions.push({ type: 'click', slot: 13 }); // Click "Custom Coordinates" Button
                let location = target[key];
                editInstructions.push({ type: 'anvil', text: `${location.relX == 0 ? "" : "~"}${location.x} ${location.relY == 0 ? "" : "~"}${location.y} ${location.relZ == 0 ? "" : "~"}${location.z} ${location.yaw == -999 ? "" : location.yaw} ${location.yaw == 0 || location.pitch == 0 ? "" : location.pitch}` });
                break;
            case "subactions":
                editInstructions.push(...actionList(start[key], target[key], false));
                break;
            case "item":
                editInstructions.push({ type: 'item', item: target[key] });
                break;
            // Action exceptions that cannot fit under other options
            case "enchantment":
                if (target[key] < 50) editInstructions.push({ type: 'click', slot: target[key] + 10 })
                else {
                    editInstructions.push({ type: 'click', slot: 53 }); // click next page
                    editInstructions.push({ type: 'click', slot: target[key] - 40 });
                }
                break;
            case "sound":
                editInstructions.push({ type: 'click', slot: 48 }); // click "Custom Sound" Button
                editInstructions.push({ type: 'chat', text: convertSound(target[key]) });
                break;
            case "slot":
                if (/(\%.*\%)|(\d+)/.test(target[key])) {
                    editInstructions.push({ type: 'click', slot: 8 }); // click "Manual Input" Button
                    editInstructions.push({ type: 'anvil', text: target[key] });
                } else {
                    editInstructions.push({ type: 'option', option: target[key] });
                }
                break;
        }
    }

    editInstructions.push({ type: 'click', slot: 31 });

    return editInstructions;

}

function actionFromNew(target, useConditions) {
    let start = { type: target.type };
    for(let key in target) {
        if(key === "type") continue;
        start[key] = (useConditions) ? conditions[target.type][key].default_value : menus[target.type][key].default_value;
    }
    return [{ type: 'click', slot: 50 }, { type: 'option', option: ((useConditions) ? conditions[target.type].condition_name : menus[target.type].action_name) }, ...action(start, target, useConditions)];
}

function actionList(start, target, useConditions) {

    let editInstructions = [];
    let page = 0;

    let current = [...start];

    for(let i = 0; i < target.length; i++) {

        let lowestDistance = {value: null, distance: Infinity};

        for(let j = 0; j < current.length; j++) {

            if(target[i].type !== current[j].type || target.includes(current[j])) continue;
            let distance = action(current[j], target[i], useConditions).length + Math.max(0, j - i);
            if(distance < lowestDistance.distance) lowestDistance = {value: current[j], index: j, distance: distance};

        }

        let distance = actionFromNew(target[i], useConditions).length + target.length - 1 - i;
        if(distance < lowestDistance.distance) lowestDistance = {distance: distance};

        if(lowestDistance.value) {
            if(lowestDistance.distance > 1) { 
                getSlot(lowestDistance.index, "click");
                editInstructions.push(...action(lowestDistance.value, target[i], useConditions));
                page = 0;
            }
            current[lowestDistance.index] = target[i];
        } else {
            editInstructions.push(...actionFromNew(target[i], useConditions));
            current.push(target[i]);
        }
    }

    for(let i = 0; i < current.length; i++) {
        if(!target.includes(current[i])) {
            getSlot(i, "rightClick");
            current.splice(i, 1);
            i--;
            if(!current.length) break;
        }
    }

    for(let i = target.length - 1; i >= 0; i--) {
        let index = current.indexOf(target[i]);
        while(i > index) {
            getSlot(index, "shiftRightClick");
            let temp = current[index + 1];
            current[index + 1] = current[index];
            current[index] = temp;
            index++;
        }
    }

    function getSlot(slot, type) {
        while(page < Math.floor(slot / 21)) {
            editInstructions.push({type: 'click', slot: 53});
            page++;
        }
        while(page > Math.floor(slot / 21)) {
            editInstructions.push({type: 'click', slot: 45});
            page--;
        }
        editInstructions.push({type: type, slot: 10 + (Math.floor((slot % 21) / 7) * 9) + (slot % 7)});
    }

    editInstructions.push({type: 'click', slot: 49});

    return editInstructions;        

}

let sounds = [
    { name: "Ambience Cave", path: "ambient.cave.cave" },
    { name: "Ambience Rain", path: "ambient.weather.rain" },
    { name: "Ambience Thunder", path: "ambient.weather.thunder" },
    { name: "Anvil Break", path: "random.anvil_break" },
    { name: "Anvil Land", path: "random.anvil_land" },
    { name: "Anvil Use", path: "random.anvil_use" },
    { name: "Arrow Hit", path: "random.bowhit" },
    { name: "Burp", path: "random.burp" },
    { name: "Chest Close", path: "random.chestclosed" },
    { name: "Chest Open", path: "random.chestopen" },
    { name: "Click", path: "random.click" },
    { name: "Door Close", path: "random.door_close" },
    { name: "Door Open", path: "random.door_open" },
    { name: "Drink", path: "random.drink" },
    { name: "Eat", path: "random.eat" },
    { name: "Explode", path: "random.explode" },
    { name: "Fall Big", path: "game.player.hurt.fall.big" },
    { name: "Fall Small", path: "game.player.hurt.fall.small" },
    { name: "Fizz", path: "random.fizz" },
    { name: "Fuse", path: "game.tnt.primed" },
    { name: "Glass", path: "dig.glass" },
    { name: "Hurt Flesh", path: "game.player.hurt" },
    { name: "Item Break", path: "random.break" },
    { name: "Item Pickup", path: "random.pop" },
    { name: "Lava Pop", path: "liquid.lavapop" },
    { name: "Level Up", path: "random.levelup" },
    { name: "Note Bass", path: "note.bass" },
    { name: "Note Piano", path: "note.harp" },
    { name: "Note Bass Drum", path: "note.bd" },
    { name: "Note Sticks", path: "note.hat" },
    { name: "Note Bass Guitar", path: "note.bassattack" },
    { name: "Note Snare Drum", path: "note.snare" },

    { name: "Note Pling", path: "note.pling" },

    { name: "Orb Pickup", path: "random.orb" },
    { name: "Shoot Arrow", path: "random.bow" },
    { name: "Splash", path: "game.player.swim.splash" },
    { name: "Swim", path: "game.player.swim" },
    { name: "Wood Click", path: "random.wood_click" },

    { name: "Bat Death", path: "mob.bat.death" },
    { name: "Bat Hurt", path: "mob.bat.hurt" },
    { name: "Bat Idle", path: "mob.bat.idle" },
    { name: "Bat Loop", path: "mob.bat.loop" },
    { name: "Bat Takeoff", path: "mob.bat.takeoff" },
    { name: "Blaze Breath", path: "mob.blaze.breathe" },
    { name: "Blaze Death", path: "mob.blaze.death" },
    { name: "Blaze Hit", path: "mob.blaze.hit" },
    { name: "Cat Hiss", path: "mob.cat.hiss" },
    { name: "Cat Hit", path: "mob.cat.hitt" },
    { name: "Cat Meow", path: "mob.cat.meow" },
    { name: "Cat Purr", path: "mob.cat.purr" },
    { name: "Cat Purreow", path: "mob.cat.purreow" },
    { name: "Chicken Idle", path: "mob.chicken.say" },
    { name: "Chicken Hurt", path: "mob.chicken.hurt" },
    { name: "Chicken Egg Pop", path: "mob.chicken.plop" },
    { name: "Chicken Walk", path: "mob.chicken.step" },
    { name: "Cow Idle", path: "mob.cow.say" },
    { name: "Cow Hurt", path: "mob.cow.hurt" },
    { name: "Cow Walk", path: "mob.cow.step" },
    { name: "Creeper Hiss", path: "mob.creeper.say" },
    { name: "Creeper Death", path: "mob.creeper.death" },
    { name: "Enderdragon Death", path: "mob.enderdragon.end" },
    { name: "Enderdragon Growl", path: "mob.enderdragon.growl" },
    { name: "Enderdragon Hit", path: "mob.enderdragon.hit" },
    { name: "Enderdragon Wings", path: "mob.enderdragon.wings" },
    { name: "Enderman Death", path: "mob.endermen.death" },
    { name: "Enderman Hit", path: "mob.endermen.hit" },
    { name: "Enderman Idle", path: "mob.endermen.idle" },
    { name: "Enderman Teleport", path: "mob.endermen.portal" },
    { name: "Enderman Scream", path: "mob.endermen.scream" },
    { name: "Enderman Stare", path: "mob.endermen.stare" },

    { name: "Ghast Scream", path: "mob.ghast.scream" },
    { name: "Ghast Scream2", path: "mob.ghast.affectionate_scream" },
    { name: "Ghast Charge", path: "mob.ghast.charge" },
    { name: "Ghast Death", path: "mob.ghast.death" },
    { name: "Ghast Fireball", path: "mob.ghast.fireball" },
    { name: "Ghast Moan", path: "mob.ghast.moan" },

    { name: "Guardian Hit", path: "mob.guardian.hit" },
    { name: "Guardian Idle", path: "mob.guardian.idle" },
    { name: "Guardian Death", path: "mob.guardian.death" },
    { name: "Guardian Elder Hit", path: "mob.guardian.elder.hit" },
    { name: "Guardian Elder Idle", path: "mob.guardian.elder.idle" },
    { name: "Guardian Elder Death", path: "mob.guardian.elder.death" },
    { name: "Guardian Land Hit", path: "mob.guardian.land.hit" },
    { name: "Guardian Land Idle", path: "mob.guardian.land.idle" },
    { name: "Guardian Land Death", path: "mob.guardian.land.death" },
    { name: "Guardian Curse", path: "mob.guardian.curse" },
    { name: "Guardian Attack", path: "mob.guardian.attack" },
    { name: "Guardian Flop", path: "mob.guardian.flop" },

    { name: "Irongolem Death", path: "mob.irongolem.death" },
    { name: "Irongolem Hit", path: "mob.irongolem.hit" },
    { name: "Irongolem Throw", path: "mob.irongolem.throw" },
    { name: "Irongolem Walk", path: "mob.irongolem.walk" },

    { name: "Magmacube Walk", path: "mob.magmacube.small" },
    { name: "Magmacube Walk2", path: "mob.magmacube.big" },
    { name: "Magmacube Jump", path: "mob.magmacube.jump" },

    { name: "Pig Idle", path: "mob.pig.say" },
    { name: "Pig Death", path: "mob.pig.death" },
    { name: "Pig Walk", path: "mob.pig.step" },

    { name: "Rabbit Ambient", path: "mob.rabbit.idle" },
    { name: "Rabbit Death", path: "mob.rabbit.death" },
    { name: "Rabbit Hurt", path: "mob.rabbit.hurt" },
    { name: "Rabbit Jump", path: "mob.rabbit.hop" },

    { name: "Sheep Idle", path: "mob.sheep.say" },
    { name: "Sheep Shear", path: "mob.sheep.shear" },
    { name: "Sheep Walk", path: "mob.sheep.step" },

    { name: "Silverfish Hit", path: "mob.silverfish.hit" },
    { name: "Silverfish Kill", path: "mob.silverfish.kill" },
    { name: "Silverfish Idle", path: "mob.silverfish.say" },
    { name: "Silverfish Walk", path: "mob.silverfish.step" },

    { name: "Skeleton Idle", path: "mob.skeleton.say" },
    { name: "Skeleton Death", path: "mob.skeleton.death" },
    { name: "Skeleton Hurt", path: "mob.skeleton.hurt" },
    { name: "Skeleton Walk", path: "mob.skeleton.step" },

    { name: "Slime Attack", path: "mob.slime.attack" },
    { name: "Slime Walk", path: "mob.slime.small" },
    { name: "Slime Walk2", path: "mob.slime.big" },

    { name: "Spider Idle", path: "mob.spider.say" },
    { name: "Spider Death", path: "mob.spider.death" },
    { name: "Spider Walk", path: "mob.spider.step" },

    { name: "Wither Death", path: "mob.wither.death" },
    { name: "Wither Hurt", path: "mob.wither.hurt" },
    { name: "Wither Idle", path: "mob.wither.idle" },
    { name: "Wither Shoot", path: "mob.wither.shoot" },
    { name: "Wither Spawn", path: "mob.wither.spawn" },

    { name: "Wolf Bark", path: "mob.wolf.bark" },
    { name: "Wolf Death", path: "mob.wolf.death" },
    { name: "Wolf Growl", path: "mob.wolf.growl" },
    { name: "Wolf Howl", path: "mob.wolf.howl" },
    { name: "Wolf Hurt", path: "mob.wolf.hurt" },
    { name: "Wolf Pant", path: "mob.wolf.panting" },
    { name: "Wolf Shake", path: "mob.wolf.shake" },
    { name: "Wolf Walk", path: "mob.wolf.step" },
    { name: "Wolf Whine", path: "mob.wolf.whine" },

    { name: "Zombie Metal", path: "mob.zombie.metal" },
    { name: "Zombie Wood", path: "mob.zombie.wood" },
    { name: "Zombie Woodbreak", path: "mob.zombie.woodbreak" },
    { name: "Zombie Idle", path: "mob.zombie.say" },
    { name: "Zombie Death", path: "mob.zombie.death" },
    { name: "Zombie Hurt", path: "mob.zombie.hurt" },
    { name: "Zombie Infect", path: "mob.zombie.infect" },
    { name: "Zombie Unfect", path: "mob.zombie.unfect" },
    { name: "Zombie Remedy", path: "mob.zombie.remedy" },
    { name: "Zombie Walk", path: "mob.zombie.step" },
    { name: "Zombie Pig Idle", path: "mob.zombiepig.zpig" },
    { name: "Zombie Pig Angry", path: "mob.zombiepig.zpigangry" },
    { name: "Zombie Pig Death", path: "mob.zombiepig.zpigdeath" },
    { name: "Zombie Pig Hurt", path: "mob.zombiepig.zpighurt" },

    { name: "Firework Blast", path: "fireworks.blast" },
    { name: "Firework Blast2", path: "fireworks.blast_far" },
    { name: "Firework Large Blast", path: "fireworks.largeBlast" },
    { name: "Firework Large Blast2", path: "fireworks.largeBlast_far" },
    { name: "Firework Twinkle", path: "fireworks.twinkle" },
    { name: "Firework Twinkle2", path: "fireworks.twinkle_far" },
    { name: "Firework Launch", path: "fireworks.launch" },

    { name: "Fireworks Blast", path: "fireworks.blast" },
    { name: "Fireworks Blast2", path: "fireworks.blast_far" },
    { name: "Fireworks Large Blast", path: "fireworks.largeBlast" },
    { name: "Fireworks Large Blast2", path: "fireworks.largeBlast_far" },
    { name: "Fireworks Twinkle", path: "fireworks.twinkle" },
    { name: "Fireworks Twinkle2", path: "fireworks.twinkle_far" },
    { name: "Fireworks Launch", path: "fireworks.launch" },

    { name: "Successful Hit", path: "random.successful_hit" },

    { name: "Horse Angry", path: "mob.horse.angry" },
    { name: "Horse Armor", path: "mob.horse.armor" },
    { name: "Horse Breathe", path: "mob.horse.breathe" },
    { name: "Horse Death", path: "mob.horse.death" },
    { name: "Horse Gallop", path: "mob.horse.gallop" },
    { name: "Horse Hit", path: "mob.horse.hit" },
    { name: "Horse Idle", path: "mob.horse.idle" },
    { name: "Horse Jump", path: "mob.horse.jump" },
    { name: "Horse Land", path: "mob.horse.land" },
    { name: "Horse Saddle", path: "mob.horse.leather" },
    { name: "Horse Soft", path: "mob.horse.soft" },
    { name: "Horse Wood", path: "mob.horse.wood" },
    { name: "Donkey Angry", path: "mob.horse.donkey.angry" },
    { name: "Donkey Death", path: "mob.horse.donkey.death" },
    { name: "Donkey Hit", path: "mob.horse.donkey.hit" },
    { name: "Donkey Idle", path: "mob.horse.donkey.idle" },
    { name: "Horse Skeleton Death", path: "mob.horse.skeleton.death" },
    { name: "Horse Skeleton Hit", path: "mob.horse.skeleton.hit" },
    { name: "Horse Skeleton Idle", path: "mob.horse.skeleton.idle" },
    { name: "Horse Zombie Death", path: "mob.horse.zombie.death" },
    { name: "Horse Zombie Hit", path: "mob.horse.zombie.hit" },
    { name: "Horse Zombie Idle", path: "mob.horse.zombie.idle" },

    { name: "Villager Death", path: "mob.villager.death" },
    { name: "Villager Haggle", path: "mob.villager.haggle" },
    { name: "Villager Hit", path: "mob.villager.hit" },
    { name: "Villager Idle", path: "mob.villager.idle" },
    { name: "Villager No", path: "mob.villager.no" },
    { name: "Villager Yes", path: "mob.villager.yes" },
];

function convertSound(sound) {
    let path = sounds.find(e => e.name.replace(" ", "_").toUpperCase() == sound);
    if (path) return path.path;
    return sound;
}