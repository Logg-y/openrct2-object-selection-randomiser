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

class AbstractDataScraper:
    outputObjectDelimiters = (None, None)
    def __init__(self, rctObjectTypes: "tuple[str, ...]", objectName: str, objectType: str, worker: Callable[[dict], Any]):
        self.objectName = objectName
        self.objectType = objectType
        self.worker = worker
        self.rctObjectTypes = rctObjectTypes
        self.data = []
    def _addCallResult(self, workerReturn: Any, obj: dict):
        raise NotImplementedError
    def run(self, openRCT2Path):
        for obj in walkThroughObjectsOfType(openRCT2Path, self.rctObjectTypes):
            workerReturn = self.worker(obj)
            self._addCallResult(workerReturn, obj)
        joinstring = ",\n"
        return f"export const {self.objectName}: {self.objectType} = \n{self.outputObjectDelimiters[0]}\n{joinstring.join(self.data)}\n{self.outputObjectDelimiters[1]} as const;\n\n"
    
class DataScraperMapped(AbstractDataScraper):
    outputObjectDelimiters = ("{", "}")
    def _addCallResult(self, workerReturn, obj):
        if workerReturn is not None:
            self.data.append(f"\"{obj['id']}\":{json.dumps(workerReturn)}")

class DataScraperArray(AbstractDataScraper):
    outputObjectDelimiters = ("[", "]")
    def _addCallResult(self, workerReturn, obj):
        if workerReturn:
            self.data.append(f"\"{obj['id']}\"")
    

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

class NameVariantLinker:
    "Worker callable that can remember some values it didn't output, so it can be used to map matching identifiers to one another"
    def __init__(self, variantOne: str, variantTwo: str):
        self.variantOne = variantOne
        self.variantTwo = variantTwo
        self.recorded = {}
    def __call__(self, obj: str) -> Union[str, None]:
        engName = obj["strings"]["name"]["en-GB"]
        for variant in (self.variantOne, self.variantTwo):
            if variant in engName:
                bareName = engName.replace(variant, "")
                if bareName in self.recorded:
                    return self.recorded[bareName]
                self.recorded[bareName] = obj["id"]

pathsWithSlopeAndStairVariants = NameVariantLinker("(Sloped)", "(Stairs)")
pathsWithSquareAndRoundedVariants = NameVariantLinker("(Square)", "(Rounded)")

def footpathIsInvisible(obj: str) -> Union[bool, None]:
    if "Invisible" in obj["strings"]["name"]["en-GB"]:
        return True

def unbuildablePaths(obj: str) -> Union[bool, None]:
    if "properties" in obj:
        if obj["properties"].get("editorOnly"):
            return True
    
# This will not necessarily give a replacement for EVERY compatibility object
# - some, like the reversed trains don't really have a replacement because there's the global reverse option now
class CompatibilityObjectToReplacementObject:
    def __init__(self):
        self.recorded = {}
    def __call__(self, obj: str) -> Union[str, None]:
        print(f"passed {obj['id']}")
        isCompatObject = obj.get("isCompatibilityObject", False)
        compat = "c-" if isCompatObject else ""
        if obj["objectType"] != "ride":
            rideTypes = obj["objectType"]
        else:
            rideTypes = obj["properties"]["type"]
        engName = obj["strings"]["name"]["en-GB"]
        if type(rideTypes) is str:
            rideTypes = [rideTypes]
        for rideType in rideTypes:
            key = f"{compat}{rideType}-{engName}"
            self.recorded[key] = obj["id"]
            othercompat = "" if isCompatObject else "c-"
            otherkey = f"{othercompat}{rideType}-{engName}"
            if otherkey in self.recorded:
                return self.recorded[otherkey]

compatibilityObjectToReplacement = CompatibilityObjectToReplacementObject()

def main():
    if not os.path.isfile("config.ini"):
        shutil.copy("config-template.ini", "config.ini")
    parser = configparser.ConfigParser()
    parser.read("config.ini")
    openRCT2Path = parser["config"]["OpenRCT2Path"]
    if not os.path.isdir(openRCT2Path):
        raise FileNotFoundError("config.ini needs to be modified to point to your OpenRCT2 install folder, where the executables and the stock /data are.")
    
    headText = ['// This file was generated automatically, see tools/parseObjectLists.py',
                ]
    
    scrapers: list[AbstractDataScraper] = []
    scrapers.append(DataScraperArray(("footpath_surface", "footpath_railings", "ride", "park_entrance"), "CompatibilityObjectIdentifiers", "string[]", findCompatibilityObjects))
    scrapers.append(DataScraperMapped(("ride",), "PregeneratedIdentifierToRideResearchCategory", "Record<string, RideResearchCategory>", getRideCategories))
    scrapers.append(DataScraperMapped(("footpath_surface",), "PathIdentifiersWithSlopedAndStairVariants", "Record<string, string>", pathsWithSlopeAndStairVariants))
    scrapers.append(DataScraperMapped(("footpath_surface",), "PathIdentifiersWithRoundedAndSquareVariants", "Record<string, string>", pathsWithSquareAndRoundedVariants))
    scrapers.append(DataScraperArray(("footpath_surface", "footpath_railings"), "InvisibleFootpathIdentifiers", "string[]", footpathIsInvisible))
    scrapers.append(DataScraperArray(("footpath_surface",), "EditorOnlyPathIdentifiers", "string[]", unbuildablePaths))
    scrapers.append(DataScraperMapped(("footpath_surface", "footpath_railings", "ride", "park_entrance"), "CompatibilityObjectToReplacement", "Record<string, string>", compatibilityObjectToReplacement))

    with open("../src/standardobjectlist.ts", "w") as f:
        f.write("\n".join(headText))
        f.write("\n"*3)
        for scraper in scrapers:
            f.write(scraper.run(openRCT2Path))

if __name__ == "__main__":
    main()