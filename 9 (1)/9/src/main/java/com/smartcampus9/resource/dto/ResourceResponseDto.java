package com.smartcampus9.resource.dto;

import com.smartcampus9.resource.model.ResourceStatus;
import com.smartcampus9.resource.model.ResourceType;

import java.time.LocalDateTime;
import java.time.LocalTime;

public class ResourceResponseDto {
    private Long id;
    private String name;
    private ResourceType type;
    private Integer capacity;
    private String location;
    private ResourceStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ResourceType getType() {
        return type;
    }

    public void setType(ResourceType type) {
        this.type = type;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public ResourceStatus getStatus() {
        return status;
    }

    public void setStatus(ResourceStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    private LocalTime availabilityStart;
    private LocalTime availabilityEnd;
    private String description;
    private String imageUrl;

    public LocalTime getAvailabilityStart() { return availabilityStart; }
    public void setAvailabilityStart(LocalTime v) { this.availabilityStart = v; }
    public LocalTime getAvailabilityEnd() { return availabilityEnd; }
    public void setAvailabilityEnd(LocalTime v) { this.availabilityEnd = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String v) { this.imageUrl = v; }
}

