# OpenRCT2 Object Selection Randomiser

This plugin for OpenRCT2 randomises the available non-scenery objects available in the current scenario, offering options about the number and type of objects loaded. If you like to replay scenarios but want a change of available rides to build, this might be for you!

## Features

- Supported objects: Rides, stalls, footpath surface, footpath railings, park entrances, bins, lamps, benches.
- Control of the number of objects loaded, either custom values or copying from whatever the scenario had originally.
- Control of the frequency of different ride types, either custom values or just copying the scenario's original spread.
- Adjust the relative amounts objects loaded by source game (RCT1, RCT2, Wacky Worlds, Time Twister...), potentially allowing you to include mostly "core" ride types but with the occasional expansion object.
- Support for replacing objects already present in the park, though doing this to rides can make them crash/nonfunctional.
- Constraints on stall availability, which can prevent you from having no stalls of a certain type.
- Supports custom objects.

Currently I do not support scenery besides bins/lamps/benches. This is mostly because simply loading other scenery sets or objects does not reliably add them to the placeable palette, and I do not know a way around that. For now, this leaves scenery research items alone, though they get shuffled in with all the new objects that get loaded.

![Settings 1](/img/options1.png)
![Path options](/img//optionspath.png)

## Possible future additions

I set this up in a way that would make configuring a manual blacklist and associations of objects that should never coexist possible, there's just no way to specify these at the moment. That could change, but it would probably be quite a complicated interface and I am not sure how worthwhile it would be to make at the moment.

# Thanks

- This is built on Basssiiie's [Typescript plugin template](https://github.com/Basssiiie/OpenRCT2-Simple-Typescript-Template), which was an incredibly useful starting point as this is almost the first thing I've ever had to do with Javascript/Typescript at all and having simple instructions to follow for a hot-reloading setup was amazing.
- Basssiiie's [FlexUI library](https://github.com/Basssiiie/OpenRCT2-FlexUI), which made setting up the UI a whole lot nicer.