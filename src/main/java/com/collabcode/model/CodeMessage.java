package com.collabcode.model;

public class CodeMessage {
    private String roomId;
    private String content;
    private String type; // "CODE", "OFFER", "ANSWER", "ICE"
    private String senderId; // random UUID to distinguish sender
    private Object rtcPayload;

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public Object getRtcPayload() { return rtcPayload; }
    public void setRtcPayload(Object rtcPayload) { this.rtcPayload = rtcPayload; }
}
