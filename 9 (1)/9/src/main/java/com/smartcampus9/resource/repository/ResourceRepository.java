package com.smartcampus9.resource.repository;

import com.smartcampus9.resource.model.Resource;
import com.smartcampus9.resource.model.ResourceStatus;
import com.smartcampus9.resource.model.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ResourceRepository extends JpaRepository<Resource, Long> {

    @Query("""
        SELECT r FROM Resource r
        WHERE (:type IS NULL OR r.type = :type)
          AND (:minCapacity IS NULL OR r.capacity >= :minCapacity)
          AND (:location IS NULL OR LOWER(r.location) LIKE LOWER(CONCAT('%', :location, '%')))
          AND (:status IS NULL OR r.status = :status)
        ORDER BY r.name ASC
        """)
    List<Resource> search(
            @Param("type") ResourceType type,
            @Param("minCapacity") Integer minCapacity,
            @Param("location") String location,
            @Param("status") ResourceStatus status
    );
}

