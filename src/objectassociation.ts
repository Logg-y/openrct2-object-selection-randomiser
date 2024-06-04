/**
 * Container for whether an object should always or never come with other objects.
 */
export class ObjectAssociation
    {
    /**
     * Whether or not this object is blocked from all inclusion.
    */
    blacklisted = false;
    /**
     * A list of object identifiers that this object should always come with.
     */
    alwaysComesWith: string[] = [];
    /**
     * A list of object identifiers that this object can never come with.
     */
    cannotCoexistWith: string[] = [];
    /**
     * A brief note about why this is set the way it is, because with what's exposed by the plugin API some things will be confusing
     */
    notes?: string

    /**
     * Whether or not this association is empty or not (whether or not we need to save it or not)
     */
    isEmpty()
    {
        return this.notes === undefined && this.alwaysComesWith.length == 0 && this.cannotCoexistWith.length == 0 && this.blacklisted == false;
    }
}

/**
 * A global mapping of object identifiers to their ObjectAssociations.
 */
export const ObjectAssociations: Record<string, ObjectAssociation> = {};
