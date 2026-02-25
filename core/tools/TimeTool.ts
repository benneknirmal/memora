import { ToolDefinition } from '../types';

/**
 * TimeTool — World clocks and push-notification timers.
 *
 * Actions:
 * - get_world_time: Current time for any city or timezone
 * - set_timer: Schedule a push notification after N hours/minutes/seconds
 *
 * Uses the free Open-Meteo geocoding API for timezone lookups.
 * Timer notifications require expo-notifications.
 */

export const TimeToolDefinition: ToolDefinition = {
    type: 'function',
    function: {
        name: 'manage_time',
        description: 'Get world times (clocks), set timers, or calculate time differences.',
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['get_world_time', 'set_timer'],
                    description: 'The time action to perform.',
                },
                location: {
                    type: 'string',
                    description: 'City or timezone for get_world_time (e.g., "Tokyo", "PST").',
                },
                hours: {
                    type: 'number',
                    description: 'Hours component of the timer duration.',
                },
                minutes: {
                    type: 'number',
                    description: 'Minutes component of the timer duration.',
                },
                seconds: {
                    type: 'number',
                    description: 'Seconds component of the timer duration.',
                },
                message: {
                    type: 'string',
                    description: 'Custom label for the timer notification.',
                }
            },
            required: ['action'],
        },
    },
};

export async function executeTimeAction(args: any): Promise<{ forLLM: string; forUser: string }> {
    const { action, location, hours, minutes, seconds, message } = args;

    try {
        switch (action) {
            case 'get_world_time': {
                if (!location) {
                    return {
                        forLLM: 'Error: location required for get_world_time',
                        forUser: "Which city's time would you like to check?"
                    };
                }

                const geoRes = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
                );
                const geoData = await geoRes.json();

                if (geoData.results && geoData.results.length > 0) {
                    const tz = geoData.results[0].timezone;
                    const timeStr = new Date().toLocaleString('en-US', { timeZone: tz });
                    return {
                        forLLM: `Current time in ${location} (${tz}): ${timeStr}`,
                        forUser: `It's currently ${timeStr.split(',')[1].trim()} in ${location}.`,
                    };
                }

                return {
                    forLLM: `Error: Could not find timezone for ${location}`,
                    forUser: `I couldn't find the timezone for ${location}.`
                };
            }

            case 'set_timer': {
                // Dynamically import expo-notifications so this file can be used
                // without the module if timers aren't needed.
                const Notifications = await import('expo-notifications');

                const { status } = await Notifications.getPermissionsAsync();
                if (status !== 'granted') {
                    const { status: askStatus } = await Notifications.requestPermissionsAsync();
                    if (askStatus !== 'granted') {
                        return {
                            forLLM: 'Error: Notification permissions not granted.',
                            forUser: 'I need notification permissions to alert you when the timer is up.'
                        };
                    }
                }

                const totalSeconds = Math.round(
                    (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0)
                );

                if (totalSeconds <= 0) {
                    return {
                        forLLM: 'Error: timer duration must be greater than 0',
                        forUser: 'How long should I set the timer for?'
                    };
                }

                let timeDisplay = '';
                if (hours) timeDisplay += `${hours}h `;
                if (minutes) timeDisplay += `${minutes}m `;
                if (seconds) timeDisplay += `${seconds}s`;
                timeDisplay = timeDisplay.trim();

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '⏰ Timer Up!',
                        body: message || `Your ${timeDisplay} timer is finished!`,
                        sound: true,
                    },
                    trigger: {
                        seconds: totalSeconds,
                        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    },
                });

                return {
                    forLLM: `Timer set for ${totalSeconds} seconds (${timeDisplay}).`,
                    forUser: `Okay, timer set for ${timeDisplay}. I'll notify you when it's done! ⏰`,
                };
            }

            default:
                return {
                    forLLM: 'Error: Invalid action. Use get_world_time or set_timer.',
                    forUser: "I'm not sure how to do that with time."
                };
        }
    } catch (error) {
        return {
            forLLM: `Error in time tool: ${String(error)}`,
            forUser: 'I had a problem with that time operation.',
        };
    }
}
