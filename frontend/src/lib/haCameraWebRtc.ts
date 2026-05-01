/**
 * Home Assistant camera WebRTC signaling (same protocol as Lovelace ha-web-rtc-player).
 * @see https://github.com/home-assistant/frontend/blob/dev/src/data/camera.ts
 */

import type { Connection } from "home-assistant-js-websocket";

export type WebRtcOfferEvent =
  | { type: "session"; session_id: string }
  | { type: "answer"; answer: string }
  | { type: "candidate"; candidate: RTCIceCandidateInit }
  | { type: "error"; code: string; message: string };

export interface CameraCapabilities {
  frontend_stream_types: ("hls" | "web_rtc")[];
}

export async function fetchCameraCapabilities(
  connection: Connection,
  entityId: string,
): Promise<CameraCapabilities> {
  return connection.sendMessagePromise({
    type: "camera/capabilities",
    entity_id: entityId,
  } as never) as Promise<CameraCapabilities>;
}

export interface WebRtcClientConfigMessage {
  configuration: RTCConfiguration;
  dataChannel?: string;
}

export async function fetchWebRtcClientConfiguration(
  connection: Connection,
  entityId: string,
): Promise<WebRtcClientConfigMessage> {
  return connection.sendMessagePromise({
    type: "camera/webrtc/get_client_config",
    entity_id: entityId,
  } as never) as Promise<WebRtcClientConfigMessage>;
}

export function webRtcOffer(
  connection: Connection,
  entityId: string,
  offer: string,
  callback: (event: WebRtcOfferEvent) => void,
): Promise<() => Promise<void>> {
  return connection.subscribeMessage(callback, {
    type: "camera/webrtc/offer",
    entity_id: entityId,
    offer,
  } as never);
}

export function addWebRtcCandidate(
  connection: Connection,
  entityId: string,
  sessionId: string,
  candidate: RTCIceCandidateInit,
): Promise<unknown> {
  return connection.sendMessagePromise({
    type: "camera/webrtc/candidate",
    entity_id: entityId,
    session_id: sessionId,
    candidate,
  } as never);
}

export function cameraSupportsWebRtc(cap: CameraCapabilities | null | undefined): boolean {
  return Boolean(cap?.frontend_stream_types?.includes("web_rtc"));
}
