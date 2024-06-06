type LogType = "warning" | "error" | "info" | "allLoads" | "sourcepreference";
const LogActivity: Record<LogType, boolean> = 
{
    warning: true,
    error: true,
    info:true,
    allLoads:true,
    sourcepreference: true,
} as const;

export function log(message: string, type: LogType)
{
    if (LogActivity[type])
    {
        console.log(`OSR: ${type}: ${message}`);
    }
}
