/*
The problem with the linear states of mainworker is that it doesn't handle needing to die with message very well.
*/

export let errorState: string | undefined = undefined;

export function setErrorState(message: string)
{
    errorState = message;
}

export function clearErrorState()
{
    errorState = undefined;
}