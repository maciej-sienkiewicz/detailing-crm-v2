pipeline {
    agent none

    environment {
        FRONTEND_IMAGE_NAME = '127.0.0.1:5000/crm-frontend'
        SCHEDULER_IMAGE_NAME = '127.0.0.1:5000/crm-scheduler'
    }
    stages {
        stage('Docker Build & Push') {
            agent {
                label 'docker'
            }

            steps {
                script {
                    def branch = env.GIT_BRANCH ?: 'unknown'
                    def tag

                    if (branch == 'origin/main') {
                        tag = 'latest'
                    } else if (branch == 'origin/develop') {
                        tag = 'develop'
                    } else {
                        error("Build przerwany: branch '${branch}' nie jest obsługiwany (tylko 'main' lub 'develop').")
                    }

                    // Get build metadata
                    def buildDate = sh(
                        script: 'date -u +"%Y-%m-%dT%H:%M:%SZ"',
                        returnStdout: true
                    ).trim()

                    def gitCommit = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()

                    echo "🏗️ Building ${FRONTEND_IMAGE_NAME}:${tag}"
                    echo "📅 Build Date: ${buildDate}"
                    echo "🔖 Git Commit: ${gitCommit}"

                    // Build with build args to bust cache and force fresh CSS generation
                    sh """
                      docker build \
                        --build-arg BUILD_DATE="${buildDate}" \
                        --build-arg GIT_COMMIT="${gitCommit}" \
                        -f ./deploy/Dockerfile \
                        -t ${FRONTEND_IMAGE_NAME}:${tag} \
                        .
                    """

                    // Verify build
                    echo "🔍 Verifying frontend build..."
                    sh """
                      docker run --rm ${FRONTEND_IMAGE_NAME}:${tag} cat /usr/share/nginx/html/build-info.txt
                    """

                    // Push to registry
                    echo "📤 Pushing frontend to registry..."
                    sh """
                      docker push ${FRONTEND_IMAGE_NAME}:${tag}
                    """

                    echo "✅ Image ${FRONTEND_IMAGE_NAME}:${tag} built and pushed successfully"

                    echo "🏗️ Building ${SCHEDULER_IMAGE_NAME}:${tag}"

                    sh """
                      docker build \
                        -f ./deploy/Dockerfile.scheduler \
                        -t ${SCHEDULER_IMAGE_NAME}:${tag} \
                        .
                    """

                    echo "📤 Pushing scheduler to registry..."
                    sh """
                      docker push ${SCHEDULER_IMAGE_NAME}:${tag}
                    """

                    echo "✅ Image ${SCHEDULER_IMAGE_NAME}:${tag} built and pushed successfully"
                }
            }
        }
    }
}
