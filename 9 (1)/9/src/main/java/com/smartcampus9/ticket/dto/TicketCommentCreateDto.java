package com.smartcampus9.ticket.dto;

import jakarta.validation.constraints.NotBlank;

public class TicketCommentCreateDto {
    @NotBlank
    private String body;

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }
}

