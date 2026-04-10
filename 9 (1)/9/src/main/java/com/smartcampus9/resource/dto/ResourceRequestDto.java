package com.smartcampus9.resource.dto;

import com.smartcampus9.resource.model.ResourceStatus;
import com.smartcampus9.resource.model.ResourceType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;

public class ResourceRequestDto {

    @NotBlank
    private String name;

    @NotNull
    private ResourceType type;

    @NotNull
    @Min(1)
    private Integer capacity;

    @NotBlank
    private String location;

    @NotNull
    private ResourceStatus status;

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

