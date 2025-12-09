import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type CallToolResult, type GetPromptResult, type ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { config } from "./config.js";

export const getServer = (): McpServer => {
  const server = new McpServer(
    {
      name: "mcp-server-template",
      version: "0.0.1",
    },
    { capabilities: {} },
  );

  // Register a simple prompt
  server.prompt(
    "greeting-template",
    "A simple greeting prompt template",
    {
      name: z.string().describe("Name to include in greeting"),
    },
    async ({ name }): Promise<GetPromptResult> => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please greet ${name} in a friendly manner.`,
            },
          },
        ],
      };
    },
  );

  server.tool(
    "greet",
    "A simple greeting tool",
    {
      name: z.string().describe("Name to greet"),
    },
    async ({ name }): Promise<CallToolResult> => {
      return {
        content: [
          {
            type: "text",
            text: `Hello, ${name}!`,
          },
        ],
      };
    },
  );

  server.tool(
    "get_fathom_transcript",
    "Récupère uniquement la transcription d'un appel Fathom spécifique. Utilisez d'abord get_fathom_calls pour obtenir les IDs disponibles.",
    {
      recording_id: z.string().describe("ID du recording Fathom (obtenu depuis l'URL du meeting, ex: '_dTipHvNkVtygtis4hBs8TtTszUW8tN7' depuis https://fathom.video/share/_dTipHvNkVtygtis4hBs8TtTszUW8tN7)"),
    },
    async ({ recording_id }): Promise<CallToolResult> => {
      try {
        const baseUrl = "https://api.fathom.ai/external/v1";
        const headers = {
          "X-Api-Key": config.FATHOM_API_KEY,
        };

        // Nettoyer le recording_id (enlever les URLs si présentes)
        let cleanedId = recording_id;
        const urlMatch = recording_id.match(/(?:fathom\.video\/(?:share|calls)\/)?([^/?#]+)/);
        if (urlMatch) {
          cleanedId = urlMatch[1];
        }

        // Récupérer la transcription via l'endpoint dédié (POST sans destination_url pour obtenir les données directement)
        const transcriptUrl = `${baseUrl}/recordings/${cleanedId}/transcript`;
        const transcriptResponse = await fetch(transcriptUrl, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}), // Corps vide pour récupération synchrone
        });

        if (!transcriptResponse.ok) {
          if (transcriptResponse.status === 401 || transcriptResponse.status === 403) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Erreur d'authentification: La clé API Fathom est invalide ou expirée.`,
                },
              ],
              isError: true,
            };
          }
          if (transcriptResponse.status === 404) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Appel non trouvé: L'ID '${cleanedId}' n'existe pas ou vous n'avez pas accès à cet appel. Utilisez get_fathom_calls pour obtenir les IDs valides.`,
                },
              ],
              isError: true,
            };
          }
          if (transcriptResponse.status === 429) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Limite de taux atteinte: L'API Fathom permet un maximum de 60 appels par minute. Veuillez réessayer dans quelques instants.`,
                },
              ],
              isError: true,
            };
          }

          const errorText = await transcriptResponse.text();
          return {
            content: [
              {
                type: "text",
                text: `❌ Erreur API Fathom (${transcriptResponse.status}): ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const transcriptData = await transcriptResponse.json();

        // Formater la transcription de manière plus lisible
        const transcript = transcriptData.transcript || transcriptData;
        
        let formattedText = `# Transcription du call Fathom\n\nRecording ID: ${cleanedId}\n\n`;
        
        if (Array.isArray(transcript)) {
          formattedText += `Total: ${transcript.length} interventions\n\n---\n\n`;
          transcript.forEach((entry: any, index: number) => {
            const speaker = entry.speaker?.display_name || "Inconnu";
            const timestamp = entry.timestamp || "";
            const text = entry.text || "";
            formattedText += `[${timestamp}] **${speaker}**: ${text}\n\n`;
          });
        } else {
          formattedText += JSON.stringify(transcript, null, 2);
        }

        return {
          content: [
            {
              type: "text",
              text: formattedText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Erreur lors de la récupération de la transcription: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_fathom_calls",
    "Récupère les appels de vente Fathom enregistrés par Paul-Antoine (paul-antoine@presti.ai) avec toutes leurs informations (métadonnées, transcription, résumé, actions, etc.)",
    {
      limit: z.number().int().positive().optional().describe("Nombre d'appels à récupérer (défaut: 10)"),
      created_after: z.string().optional().describe("Date de début au format ISO (ex: 2024-01-01T00:00:00Z)"),
      created_before: z.string().optional().describe("Date de fin au format ISO (ex: 2024-12-31T23:59:59Z)"),
      include_transcript: z.boolean().optional().describe("Inclure la transcription complète (défaut: true)"),
      include_summary: z.boolean().optional().describe("Inclure le résumé (défaut: true)"),
      include_action_items: z.boolean().optional().describe("Inclure les actions à entreprendre (défaut: true)"),
    },
    async ({ 
      limit = 10, 
      created_after, 
      created_before,
      include_transcript = true,
      include_summary = true,
      include_action_items = true
    }): Promise<CallToolResult> => {
      try {
        const baseUrl = "https://api.fathom.ai/external/v1";
        const headers = {
          "X-Api-Key": config.FATHOM_API_KEY,
        };

        // Construire les paramètres de requête
        const params = new URLSearchParams();
        if (limit) params.append("limit", limit.toString());
        if (created_after) params.append("created_after", created_after);
        if (created_before) params.append("created_before", created_before);
        if (include_transcript) params.append("include_transcript", "true");
        if (include_summary) params.append("include_summary", "true");
        if (include_action_items) params.append("include_action_items", "true");
        
        // Filtrer uniquement les appels enregistrés par Paul-Antoine
        params.append("recorded_by[]", "paul-antoine@presti.ai");

        const queryString = params.toString();
        const url = `${baseUrl}/meetings${queryString ? `?${queryString}` : ""}`;

        // Récupérer la liste des meetings
        const meetingsResponse = await fetch(url, {
          method: "GET",
          headers,
        });

        if (!meetingsResponse.ok) {
          if (meetingsResponse.status === 401 || meetingsResponse.status === 403) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Erreur d'authentification: La clé API Fathom est invalide ou expirée.`,
                },
              ],
              isError: true,
            };
          }
          if (meetingsResponse.status === 429) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Limite de taux atteinte: L'API Fathom permet un maximum de 60 appels par minute. Veuillez réessayer dans quelques instants.`,
                },
              ],
              isError: true,
            };
          }

          const errorText = await meetingsResponse.text();
          return {
            content: [
              {
                type: "text",
                text: `❌ Erreur API Fathom (${meetingsResponse.status}): ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const meetingsData = await meetingsResponse.json();
        const meetings = meetingsData.items || [];
        const nextCursor = meetingsData.next_cursor;

        // Formater la réponse selon la structure de l'API Fathom
        const formattedResponse = {
          total_meetings: meetings.length,
          next_cursor: nextCursor || null,
          meetings: meetings.map((meeting: any) => ({
            title: meeting.title || meeting.meeting_title,
            url: meeting.url,
            share_url: meeting.share_url,
            created_at: meeting.created_at,
            scheduled_start_time: meeting.scheduled_start_time,
            scheduled_end_time: meeting.scheduled_end_time,
            recording_start_time: meeting.recording_start_time,
            recording_end_time: meeting.recording_end_time,
            meeting_type: meeting.meeting_type,
            transcript_language: meeting.transcript_language,
            calendar_invitees: meeting.calendar_invitees || [],
            recorded_by: meeting.recorded_by,
            transcript: meeting.transcript || null,
            default_summary: meeting.default_summary || null,
            action_items: meeting.action_items || [],
            crm_matches: meeting.crm_matches || null,
          })),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedResponse, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Erreur lors de la récupération des appels Fathom: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.resource(
    "greeting-resource",
    "https://example.com/greetings/default",
    { mimeType: "text/plain" },
    async (): Promise<ReadResourceResult> => {
      return {
        contents: [
          {
            uri: "https://example.com/greetings/default",
            text: "Hello, world!",
          },
        ],
      };
    },
  );

  return server;
};
