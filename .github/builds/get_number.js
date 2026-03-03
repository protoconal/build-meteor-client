/*
 * This file is part of the Meteor Client distribution (https://github.com/MeteorDevelopment/meteor-client).
 * Copyright (c) Meteor Development.
 */

import { getMcVersion } from "./mc_version.js"

const mcVersion = await getMcVersion();

// Remove API call to get the current build number from the official API.
console.log("number=0")
