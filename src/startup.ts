import { randomiserUpdateHook } from "./mainworker";
import { UIRandomiserInProgress } from "./uirunning";
import { UISettings } from "./uisettings";
import { StringTable } from "./util/strings";

function onClickMenuItem()
{
	if (randomiserUpdateHook === undefined)
	{
		UISettings();
	}
	else
	{
		UIRandomiserInProgress();
	}
}

export function startup()
{
	// Write code here that should happen on startup of the plugin.



	// Register a menu item under the map icon:
	if (typeof ui !== "undefined")
	{
		ui.registerMenuItem(StringTable.PLUGIN_NAME, () => onClickMenuItem());
	}
}