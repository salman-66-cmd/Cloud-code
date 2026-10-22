from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import (
    Project, ProjectMember, ProjectRole, ProjectStatus, ProjectVisibility,
    File, FileVersion, ActivityEvent, User
)
from app.schemas.schemas import ProjectCreate, ProjectUpdate
from typing import Optional, List, Dict, Any
import uuid

STARTER_TEMPLATES = {
    "python": {
        "files": [
            {
                "name": "main.py",
                "path": "/main.py",
                "language": "python",
                "is_folder": False,
                "content": '''"""
CloudCode - Python Starter Workspace
Cloud-based real-time collaborative code execution demo
"""

import sys
import math

def calculate_primes(limit: int):
    primes = []
    for num in range(2, limit + 1):
        if all(num % i != 0 for i in range(2, int(math.isqrt(num)) + 1)):
            primes.append(num)
    return primes

def main():
    print("🚀 Welcome to CloudCode Workspace!")
    print(f"Python Version: {sys.version.split()[0]}")
    print("-" * 40)
    
    primes = calculate_primes(50)
    print(f"Calculated primes up to 50: {primes}")
    print("-" * 40)
    print("✅ Collaborative cloud execution completed successfully.")

if __name__ == "__main__":
    main()
'''
            },
            {
                "name": "README.md",
                "path": "/README.md",
                "language": "markdown",
                "is_folder": False,
                "content": '''# Python Starter Project

Welcome to your CloudCode collaborative development environment!

## Features
- **Real-time Collaboration**: Invite teammates to edit `main.py` simultaneously.
- **Isolated Execution**: Click the **Run** button (or press `Ctrl+Enter`) to run in an isolated sandbox.
- **Version History**: Review and restore previous checkpoints.
'''
            }
        ]
    },
    "javascript": {
        "files": [
            {
                "name": "index.js",
                "path": "/index.js",
                "language": "javascript",
                "is_folder": False,
                "content": '''// CloudCode - JavaScript (Node.js) Starter
const os = require('os');

function simulateCloudMetrics() {
  console.log("☁️  CloudCode Node.js Worker Runtime");
  console.log(`OS Platform: ${os.platform()} (${os.arch()})`);
  console.log(`Free Memory: ${(os.freemem() / 1024 / 1024).toFixed(2)} MB`);
  
  const tasks = [
    { id: "TASK-101", name: "Centralized Storage Sync", status: "DONE" },
    { id: "TASK-102", name: "CRDT State Propagation", status: "ACTIVE" },
    { id: "TASK-103", name: "Isolated Sandbox Container", status: "READY" }
  ];
  
  console.table(tasks);
  console.log("✨ CloudCode execution complete!");
}

simulateCloudMetrics();
'''
            },
            {
                "name": "package.json",
                "path": "/package.json",
                "language": "json",
                "is_folder": False,
                "content": '''{
  "name": "cloudcode-node-starter",
  "version": "1.0.0",
  "description": "CloudCode JavaScript Starter Project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}
'''
            }
        ]
    },
    "typescript": {
        "files": [
            {
                "name": "main.ts",
                "path": "/main.ts",
                "language": "typescript",
                "is_folder": False,
                "content": '''// CloudCode - TypeScript Starter
interface CloudNode {
  id: string;
  name: string;
  status: 'online' | 'standby' | 'syncing';
  latencyMs: number;
}

const cluster: CloudNode[] = [
  { id: "us-east-1", name: "Primary API Gateway", status: "online", latencyMs: 12 },
  { id: "eu-west-1", name: "Collaboration Broker", status: "online", latencyMs: 24 },
  { id: "ap-south-1", name: "Execution Worker Pool", status: "syncing", latencyMs: 45 }
];

console.log("⚡ CloudCode Distributed Cluster Status:");
cluster.forEach(node => {
  console.log(`- [${node.status.toUpperCase()}] ${node.name} (${node.id}) -> ${node.latencyMs}ms`);
});
'''
            }
        ]
    },
    "html": {
        "files": [
            {
                "name": "index.html",
                "path": "/index.html",
                "language": "html",
                "is_folder": False,
                "content": '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CloudCode Web Sandbox</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <h1>☁️ CloudCode Live Web Preview</h1>
    <p>This page runs inside an isolated iframe sandbox with strict security policies.</p>
    <button id="counterBtn">Clicks: 0</button>
  </div>
  <script src="script.js"></script>
</body>
</html>
'''
            },
            {
                "name": "style.css",
                "path": "/style.css",
                "language": "css",
                "is_folder": False,
                "content": '''body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}
.card {
  background: #1e293b;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  border: 1px solid #334155;
  text-align: center;
}
button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
button:hover {
  background: #2563eb;
}
'''
            },
            {
                "name": "script.js",
                "path": "/script.js",
                "language": "javascript",
                "is_folder": False,
                "content": '''let count = 0;
const btn = document.getElementById('counterBtn');
btn.addEventListener('click', () => {
  count++;
  btn.textContent = `Clicks: ${count}`;
});
'''
            }
        ]
    },
    "c": {
        "files": [
            {
                "name": "main.c",
                "path": "/main.c",
                "language": "c",
                "is_folder": False,
                "content": '''#include <stdio.h>

int main() {
    printf("========================================\\n");
    printf("   CloudCode C Execution Sandbox       \\n");
    printf("========================================\\n");
    printf("Compiled and executed in an isolated worker.\\n");
    
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        sum += i;
    }
    printf("Sum of 1..10 = %d\\n", sum);
    return 0;
}
'''
            }
        ]
    },
    "cpp": {
        "files": [
            {
                "name": "main.cpp",
                "path": "/main.cpp",
                "language": "cpp",
                "is_folder": False,
                "content": '''#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::cout << "🚀 CloudCode C++ Sandbox Runner\\n";
    std::vector<int> numbers = {10, 20, 30, 40, 50};
    int total = std::accumulate(numbers.begin(), numbers.end(), 0);
    std::cout << "Vector sum calculated: " << total << std::endl;
    return 0;
}
'''
            }
        ]
    }
}

async def create_project_with_template(
    db: AsyncSession,
    user: User,
    data: ProjectCreate
) -> Project:
    project = Project(
        name=data.name,
        description=data.description,
        owner_id=user.id,
        language=data.language or "python",
        visibility=data.visibility or ProjectVisibility.PRIVATE.value,
        status=ProjectStatus.ACTIVE.value,
        is_template=False
    )
    db.add(project)
    await db.flush()

    # Add owner as project member
    member = ProjectMember(
        project_id=project.id,
        user_id=user.id,
        role=ProjectRole.OWNER.value
    )
    db.add(member)

    # Record activity
    activity = ActivityEvent(
        project_id=project.id,
        user_id=user.id,
        action="project_created",
        details=f"Project '{project.name}' created with {project.language} template."
    )
    db.add(activity)

    # Seed starter template files
    template_key = (data.template or data.language or "python").lower()
    template_data = STARTER_TEMPLATES.get(template_key, STARTER_TEMPLATES["python"])
    
    total_size = 0
    for f in template_data["files"]:
        content_bytes = f["content"].encode('utf-8')
        file_obj = File(
            project_id=project.id,
            name=f["name"],
            path=f["path"],
            is_folder=f.get("is_folder", False),
            content=f["content"],
            language=f.get("language", "plaintext"),
            size=len(content_bytes)
        )
        db.add(file_obj)
        await db.flush()
        
        # Initial version snapshot
        version = FileVersion(
            file_id=file_obj.id,
            version_num=1,
            content=f["content"],
            created_by_id=user.id,
            commit_message="Initial starter file"
        )
        db.add(version)
        total_size += len(content_bytes)

    project.storage_usage = total_size
    await db.commit()
    await db.refresh(project)
    return project

async def duplicate_project(
    db: AsyncSession,
    user: User,
    source_project: Project,
    new_name: Optional[str] = None
) -> Project:
    name = new_name or f"{source_project.name} (Copy)"
    new_project = Project(
        name=name,
        description=source_project.description,
        owner_id=user.id,
        language=source_project.language,
        visibility=ProjectVisibility.PRIVATE.value,
        status=ProjectStatus.ACTIVE.value,
        storage_usage=source_project.storage_usage
    )
    db.add(new_project)
    await db.flush()

    # Add owner membership
    member = ProjectMember(
        project_id=new_project.id,
        user_id=user.id,
        role=ProjectRole.OWNER.value
    )
    db.add(member)

    # Fetch and clone files
    res = await db.execute(select(File).where(File.project_id == source_project.id))
    files = res.scalars().all()
    
    # Map old file ID to new file ID for parent_id hierarchy
    id_map = {}
    for f in files:
        new_file = File(
            project_id=new_project.id,
            name=f.name,
            path=f.path,
            is_folder=f.is_folder,
            content=f.content,
            language=f.language,
            size=f.size
        )
        db.add(new_file)
        await db.flush()
        id_map[f.id] = new_file.id
        
        # Seed initial version for new file
        version = FileVersion(
            file_id=new_file.id,
            version_num=1,
            content=new_file.content,
            created_by_id=user.id,
            commit_message="Cloned from project copy"
        )
        db.add(version)

    # Update parent_ids in new files
    for f in files:
        if f.parent_id and f.id in id_map:
            new_f_id = id_map[f.id]
            new_parent_id = id_map.get(f.parent_id)
            new_file_obj = await db.get(File, new_f_id)
            if new_file_obj:
                new_file_obj.parent_id = new_parent_id

    activity = ActivityEvent(
        project_id=new_project.id,
        user_id=user.id,
        action="project_duplicated",
        details=f"Project duplicated from '{source_project.name}'"
    )
    db.add(activity)

    await db.commit()
    await db.refresh(new_project)
    return new_project
