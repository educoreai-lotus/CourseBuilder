# PowerShell script to test AI course creation
# Usage: .\test-ai-course-creation.ps1

$uri = "http://localhost:3000/api/v1/courses/input"

$body = @{
    learner_id = "10000000-0000-0000-0000-000000000001"
    learner_name = "Alice Learner"
    learner_company = "Emerald Learning"
    learning_path = @(
        @{
            topic_name = "JavaScript Fundamentals"
            topic_description = "Learn JavaScript basics and core concepts"
        },
        @{
            topic_name = "React Development"
            topic_description = "Build modern React applications"
        }
    )
    skills = @("javascript", "react", "frontend")
    level = "beginner"
    duration = 10
    metadata = @{
        learner_id = "10000000-0000-0000-0000-000000000001"
        learner_company = "Emerald Learning"
    }
    sourceService = "test-script"
} | ConvertTo-Json -Depth 10

Write-Host "🚀 Creating course via API..." -ForegroundColor Cyan
Write-Host "📡 URL: $uri" -ForegroundColor Gray
Write-Host ""

try {
    $headers = @{
        "Content-Type" = "application/json"
        "x-service-name" = "test-script"
        "x-role" = "service"
        "x-user-role" = "service"
    }
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -Headers $headers
    
    Write-Host "✅ Course created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    Write-Host ""
    Write-Host "=" -repeat(70) -ForegroundColor Cyan
    Write-Host "🤖 AI Structure Information" -ForegroundColor Cyan
    Write-Host "=" -repeat(70) -ForegroundColor Cyan
    Write-Host ""
    
    if ($response.structure) {
        Write-Host "📊 Structure Summary:" -ForegroundColor Yellow
        Write-Host "   Topics: $($response.structure.topics)"
        Write-Host "   Modules: $($response.structure.modules)"
        Write-Host "   Lessons: $($response.structure.lessons)"
        Write-Host "   Structure Source: $($response.structure.structureSource)" -ForegroundColor $(if ($response.structure.structureSource -eq "ai-generated") { "Green" } else { "Yellow" })
        
        if ($response.structure.structureSource -eq "ai-generated") {
            Write-Host ""
            Write-Host "✅ AI successfully generated the structure!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "⚠️  AI was not used (fallback structure)" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "🔍 To verify AI structure, run:" -ForegroundColor Cyan
    Write-Host "   cd backend" -ForegroundColor Gray
    Write-Host "   npm run check:ai-structure $($response.course_id)" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "❌ Error creating course:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Error details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "💡 Make sure:" -ForegroundColor Cyan
    Write-Host "   1. Backend server is running (npm run dev)" -ForegroundColor Gray
    Write-Host "   2. Server is accessible at http://localhost:3000" -ForegroundColor Gray
    Write-Host "   3. OpenAI API key is set in .env file" -ForegroundColor Gray
}
