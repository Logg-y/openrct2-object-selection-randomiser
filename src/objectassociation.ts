
/**
 * Container for whether an object should always or never come with other objects.
 */
export interface ObjectAssociation
    {
    /**
     * Whether or not this object is blocked from all inclusion.
    */
    blacklisted: boolean,
    /**
     * A list of object identifiers that this object should always come with.
     */
    alwaysComesWith: string[],
    /**
     * A list of object identifiers that this object can never come with.
     */
    cannotCoexistWith: string[],
}

/**
 * A global mapping of object identifiers to their ObjectAssociations.
 */
export const ObjectAssociations: Record<string, ObjectAssociation> = {};

