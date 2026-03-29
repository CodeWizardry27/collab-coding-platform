package com.collabcode.controller;

import com.collabcode.model.CodeMessage;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class RoomController {

    @MessageMapping("/code/{roomId}")
    @SendTo("/topic/room/{roomId}")
    public CodeMessage broadcastCode(@DestinationVariable String roomId, @Payload CodeMessage change) {
        return change;
    }
}
