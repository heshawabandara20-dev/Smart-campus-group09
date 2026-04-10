package com.smartcampus9.resource.web;

import com.smartcampus9.resource.dto.ResourceRequestDto;
import com.smartcampus9.resource.dto.ResourceResponseDto;
import com.smartcampus9.resource.model.Resource;
import com.smartcampus9.resource.model.ResourceStatus;
import com.smartcampus9.resource.model.ResourceType;
import com.smartcampus9.resource.service.ResourceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ResourceResponseDto create(@Valid @RequestBody ResourceRequestDto dto) {
        Resource created = resourceService.create(toEntity(dto));
        return toDto(created);
    }

    @GetMapping("/{id}")
    public ResourceResponseDto getById(@PathVariable Long id) {
        return toDto(resourceService.getById(id));
    }

    @GetMapping
    public List<ResourceResponseDto> search(
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) ResourceStatus status
    ) {
        return resourceService.search(type, minCapacity, location, status)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResourceResponseDto update(@PathVariable Long id, @Valid @RequestBody ResourceRequestDto dto) {
        Resource updated = resourceService.update(id, toEntity(dto));
        return toDto(updated);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        resourceService.delete(id);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResourceResponseDto updateStatus(@PathVariable Long id, @RequestParam ResourceStatus status) {
        return toDto(resourceService.updateStatus(id, status));
    }

    private Resource toEntity(ResourceRequestDto dto) {
        Resource r = new Resource(dto.getName(), dto.getType(), dto.getCapacity(), dto.getLocation(), dto.getStatus());
        r.setAvailabilityStart(dto.getAvailabilityStart());
        r.setAvailabilityEnd(dto.getAvailabilityEnd());
        r.setDescription(dto.getDescription());
        r.setImageUrl(dto.getImageUrl());
        return r;
    }

    private ResourceResponseDto toDto(Resource r) {
        ResourceResponseDto dto = new ResourceResponseDto();
        dto.setId(r.getId());
        dto.setName(r.getName());
        dto.setType(r.getType());
        dto.setCapacity(r.getCapacity());
        dto.setLocation(r.getLocation());
        dto.setStatus(r.getStatus());
        dto.setAvailabilityStart(r.getAvailabilityStart());
        dto.setAvailabilityEnd(r.getAvailabilityEnd());
        dto.setDescription(r.getDescription());
        dto.setImageUrl(r.getImageUrl());
        dto.setCreatedAt(r.getCreatedAt());
        dto.setUpdatedAt(r.getUpdatedAt());
        return dto;
    }
}

