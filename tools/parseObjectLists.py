import os
from typing import Iterator, Callable, Any, Union
import zipfile
import configparser
import shutil
import json
import io

# This script simply parses the standard objects that come bundled with OpenRCT and produces standardobjectlists.ts
# Some of the options like "force consistency in sloped and staired queues" or "do not allow compatibility objects" is otherwise
# impossible to get info for via the plugin API at the moment. This on the other hand, does just fine.

def walkThroughObjectsOfType(openRCT2Path: str, objectTypes: "tuple[str, ...]") -> Iterator[dict]:
    "Walks through the OpenRCT2 path data files and yield all objects of the specified type."
    objectsFound = 0
    for sourceGame in os.listdir(os.path.join(openRCT2Path, "data/object")):
        for objectType in objectTypes:
            objectTypeDir = os.path.join(openRCT2Path, "data/object", sourceGame, objectType)
            if os.path.isdir(objectTypeDir):
                for objectFile in os.listdir(objectTypeDir):
                    fullFilePath = os.path.join(openRCT2Path, "data/object", sourceGame, objectType, objectFile)
                    if os.path.isfile(fullFilePath):
                        if fullFilePath.endswith(".json"):
                            with open(fullFilePath, "r", encoding="utf8") as f:
                                parsed = json.load(f)
                            yield parsed
                            objectsFound += 1
                        elif fullFilePath.endswith(".parkobj"):
                            # These things are, apparently, just zip-type archives
                            with zipfile.ZipFile(fullFilePath, "r") as zip:
                                if "object.json" in zip.namelist():
                                    with io.TextIOWrapper(zip.open("object.json"), encoding="utf8") as jsonFile:
                                        yield json.load(jsonFile)
                                        objectsFound += 1
    print(f"Found {objectsFound} total objects of types {objectTypes}.")

class DataScraper:
    def __init__(self, objTypes: "tuple[str, ...]", mapName: str, mapType: str, worker: Callable[[dict], Any]):
        self.mapName = mapName
        self.mapType = mapType
        self.worker = worker
        self.objTypes = objTypes
        self.data = []
    def run(self, openRCT2Path):
        for obj in walkThroughObjectsOfType(openRCT2Path, self.objTypes):
            workerReturn = self.worker(obj)
            if workerReturn is not None:
                self.data.append(f"\"{obj['id']}\":{json.dumps(workerReturn)}")
        joinstring = ",\n"
        return f"export const {self.mapName}: {self.mapType} = \n{{\n{joinstring.join(self.data)}\n}} as const;\n\n"
    


def findCompatibilityObjects(obj: str) -> Union[bool, None]:
    if obj.get("isCompatibilityObject", False):
        return True
    return None

def getRideCategories(obj: str) -> str:
    category = obj["properties"]["category"]
    if type(category) is list:
        category = category[0]
    if category == "stall": return "shop"
    return category

def slopedOrStairs(obj: str) -> Union[str, None]:
    engName = obj["strings"]["name"]["en-GB"]
    if "(Sloped)" in engName: return "sloped"
    elif "(Stairs)" in engName: return "stairs"

def roundedOrSquare(obj: str) -> Union[str, None]:
    engName = obj["strings"]["name"]["en-GB"]
    if "(Rounded)" in engName: return "rounded"
    elif "(Square)" in engName: return "square"

def footpathIsInvisible(obj: str) -> Union[bool, None]:
    if "Invisible" in obj["strings"]["name"]["en-GB"]:
        return True

def unbuildablePaths(obj: str) -> Union[bool, None]:
    if "properties" in obj:
        if obj["properties"].get("editorOnly"):
            return True

def main():
    if not os.path.isfile("config.ini"):
        shutil.copy("config-template.ini", "config.ini")
    parser = configparser.ConfigParser()
    parser.read("config.ini")
    openRCT2Path = parser["config"]["OpenRCT2Path"]
    if not os.path.isdir(openRCT2Path):
        raise FileNotFoundError("config.ini needs to be modified to point to your OpenRCT2 install folder, where the executables and the stock /data are.")
    
    headText = ['// This file was generated automatically, see tools/parseObjectLists.py',
                'export type SlopedOrStairs = "sloped" | "stairs";',
                'export type RoundedOrSquare = "rounded" | "square";']
    
    scrapers: list[DataScraper] = []
    scrapers.append(DataScraper(("footpath_surface", "footpath_railings", "ride", "park_entrance"), "IdentifierIsCompatibilityObject", "Record<string, boolean>", findCompatibilityObjects))
    scrapers.append(DataScraper(("ride",), "PregeneratedIdentifierToRideResearchCategory", "Record<string, RideResearchCategory>", getRideCategories))
    scrapers.append(DataScraper(("footpath_surface",), "IdentifierToSlopedOrStairs", "Record<string, SlopedOrStairs>", slopedOrStairs))
    scrapers.append(DataScraper(("footpath_surface",), "IdentifierToRoundedOrSquare", "Record<string, RoundedOrSquare>", roundedOrSquare))
    scrapers.append(DataScraper(("footpath_surface",), "IdentifierToInvisibleFootpath", "Record<string, boolean>", footpathIsInvisible))
    scrapers.append(DataScraper(("footpath_surface",), "IdentifierIsEditorOnlyPath", "Record<string, boolean>", unbuildablePaths))

    with open("../src/standardobjectlist.ts", "w") as f:
        f.write("\n".join(headText))
        f.write("\n"*3)
        for scraper in scrapers:
            f.write(scraper.run(openRCT2Path))

if __name__ == "__main__":
    main()