package com.smartcampus9.resource.service;

import com.smartcampus9.common.exception.BadRequestException;
import com.smartcampus9.common.exception.NotFoundException;
import com.smartcampus9.resource.model.Resource;
import com.smartcampus9.resource.model.ResourceStatus;
import com.smartcampus9.resource.model.ResourceType;
import com.smartcampus9.resource.repository.ResourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ResourceService {

    private final ResourceRepository resourceRepository;

    public ResourceService(ResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
    }

    public Resource create(Resource resource) {
        if (resource == null) {
            throw new BadRequestException("Resource payload is required.");
        }
        return resourceRepository.save(resource);
    }

    public Resource getById(Long id) {
        if (id == null || id <= 0) {
            throw new BadRequestException("Invalid resource id.");
        }
        return resourceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Resource not found."));
    }

    public List<Resource> listAll() {
        return resourceRepository.findAll();
    }

    public List<Resource> search(ResourceType type, Integer minCapacity, String location, ResourceStatus status) {
        if (minCapacity != null && minCapacity <= 0) {
            throw new BadRequestException("minCapacity must be greater than 0.");
        }
        return resourceRepository.search(type, minCapacity, normalize(location), status);
    }

    public Resource update(Long id, Resource update) {
        Resource existing = getById(id);

        if (update == null) {
            throw new BadRequestException("Resource payload is required.");
        }

        existing.setName(update.getName());
        existing.setType(update.getType());
        existing.setCapacity(update.getCapacity());
        existing.setLocation(update.getLocation());
        existing.setStatus(update.getStatus());
        existing.setAvailabilityStart(update.getAvailabilityStart());
        existing.setAvailabilityEnd(update.getAvailabilityEnd());
        existing.setDescription(update.getDescription());
        if (update.getImageUrl() != null) {
            existing.setImageUrl(update.getImageUrl());
        }
        return resourceRepository.save(existing);
    }

    public Resource updateStatus(Long id, ResourceStatus status) {
        if (status == null) {
            throw new BadRequestException("status is required.");
        }
        Resource existing = getById(id);
        existing.setStatus(status);
        return resourceRepository.save(existing);
    }

    public void delete(Long id) {
        Resource existing = getById(id);
        resourceRepository.delete(existing);
    }

    private String normalize(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}

