type LogType = "warning" | "error" | "info" | "allLoads" | "sourcepreference" | "stallresearch";
const LogActivity: Record<LogType, boolean> = 
{
    warning: true,
    error: true,
    info:true,
    allLoads:false,
    sourcepreference: false,
    stallresearch: false,
} as const;

export function log(message: string, type: LogType)
{
    if (LogActivity[type])
    {
        console.log(`OSR: ${type}: ${message}`);
    }
}
