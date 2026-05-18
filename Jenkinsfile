/**
 * Watch Party — CI/CD for frontend, backend, and middleware.
 *
 * Requirements (typical Linux agent):
 *   - Docker (Pipeline) plugin
 *   - Git
 *
 * Optional Jenkins credentials (configure in job):
 *   - google-oauth-client-id (Secret text) → VITE_GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID
 *   - docker-registry (Username/password) → push images when PUSH_IMAGES=true
 *
 * Optional environment / parameters override image names and registry.
 */
pipeline {
  agent any

  options {
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 45, unit: 'MINUTES')
    disableConcurrentBuilds(abortPrevious: true)
    timestamps()
  }

  parameters {
    booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run backend tests and frontend production build')
    booleanParam(name: 'BUILD_DOCKER', defaultValue: true, description: 'Build container images')
    booleanParam(name: 'PUSH_IMAGES', defaultValue: false, description: 'Push images to REGISTRY (requires credentials)')
    string(name: 'REGISTRY', defaultValue: '', description: 'Registry host/prefix, e.g. docker.io/myorg (no trailing slash)')
    string(name: 'IMAGE_TAG', defaultValue: '', description: 'Image tag (defaults to BUILD_NUMBER-gitShort)')
  }

  environment {
    GIT_SHORT = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'local'}"
    TAG = "${params.IMAGE_TAG ?: "${env.BUILD_NUMBER}-${env.GIT_SHORT}"}"
    IMAGE_PREFIX = "${params.REGISTRY ? "${params.REGISTRY}/" : ''}watch-party"
    BACKEND_IMAGE = "${IMAGE_PREFIX}-backend:${TAG}"
    FRONTEND_IMAGE = "${IMAGE_PREFIX}-frontend:${TAG}"
    MIDDLEWARE_IMAGE = "${IMAGE_PREFIX}-middleware:${TAG}"
  }

  stages {
    stage('Build & test') {
      when {
        expression { params.RUN_TESTS }
      }
      parallel {
        stage('Backend') {
          agent {
            docker {
              image 'maven:3.9.9-eclipse-temurin-21-alpine'
              args '-v watch-party-m2:/root/.m2'
              reuseNode true
            }
          }
          steps {
            dir('backend') {
              sh 'mvn -B clean test package -DskipTests=false'
            }
          }
          post {
            always {
              junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml'
            }
          }
        }

        stage('Frontend') {
          agent {
            docker {
              image 'node:22-alpine'
              reuseNode true
            }
          }
          steps {
            dir('frontend') {
              sh 'npm ci'
              sh 'npm run build'
            }
          }
        }

        stage('Middleware') {
          agent {
            docker {
              image 'node:22-alpine'
              reuseNode true
            }
          }
          steps {
            dir('middleware') {
              sh 'npm ci --omit=dev'
              sh 'node --check src/server.js'
            }
          }
        }
      }
    }

    stage('Docker images') {
      when {
        expression { params.BUILD_DOCKER }
      }
      parallel {
        stage('Image — backend') {
          steps {
            script {
              docker.build(BACKEND_IMAGE, './backend')
            }
          }
        }

        stage('Image — frontend') {
          environment {
            VITE_GOOGLE_CLIENT_ID = ''
          }
          steps {
            script {
              def googleId = ''
              try {
                withCredentials([
                  string(credentialsId: 'google-oauth-client-id', variable: 'GOOGLE_CLIENT_ID'),
                ]) {
                  googleId = env.GOOGLE_CLIENT_ID ?: ''
                }
              } catch (ignored) {
                echo 'Credential google-oauth-client-id not set; building frontend without VITE_GOOGLE_CLIENT_ID'
              }
              docker.build(
                FRONTEND_IMAGE,
                "--build-arg VITE_GOOGLE_CLIENT_ID=${googleId} ./frontend",
              )
            }
          }
        }

        stage('Image — middleware') {
          steps {
            script {
              docker.build(MIDDLEWARE_IMAGE, './middleware')
            }
          }
        }
      }
    }

    stage('Push images') {
      when {
        allOf {
          expression { params.BUILD_DOCKER }
          expression { params.PUSH_IMAGES }
          expression { params.REGISTRY?.trim() }
        }
      }
      steps {
        script {
          docker.withRegistry("https://${params.REGISTRY.split('/')[0]}", 'docker-registry') {
            docker.image(BACKEND_IMAGE).push()
            docker.image(BACKEND_IMAGE).push('latest')
            docker.image(FRONTEND_IMAGE).push()
            docker.image(FRONTEND_IMAGE).push('latest')
            docker.image(MIDDLEWARE_IMAGE).push()
            docker.image(MIDDLEWARE_IMAGE).push('latest')
          }
        }
      }
    }
  }

  post {
    success {
      echo """\
Build ${env.BUILD_NUMBER} succeeded.
  Backend:    ${BACKEND_IMAGE}
  Frontend:   ${FRONTEND_IMAGE}
  Middleware: ${MIDDLEWARE_IMAGE}
""".stripIndent()
    }
    failure {
      echo "Build ${env.BUILD_NUMBER} failed — see stage logs above."
    }
    cleanup {
      cleanWs(deleteDirs: true, patterns: [[pattern: '**/node_modules', type: 'INCLUDE']])
    }
  }
}
