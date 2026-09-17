# ============================================================
# p2s-app — Makefile build / release
# ============================================================
# Usage:
#   make build                   Build image latest
#   make release                 Build + push image latest
#   make run                     Build + jalankan container
#   make staging                 Full flow staging (build + release)
#   make production              Full flow production (build + release)
#   make help                    Daftar perintah
#
# Image:
#   ORG_REGISTRY = newrahmat
#   IMAGE_NAME   = p2s-app
#   IMAGE_TAG    = latest
#   → newrahmat/p2s-app:latest
#
# Override bila perlu:
#   make build IMAGE_TAG=v1.2.3
#   make build ENV=staging PORT=8080
#
# Platform:
#   Semua build dipaksa linux/amd64 (PLATFORM ?= linux/amd64),
#   agar image cocok dengan node deploy. `make release` memverifikasi
#   hasil build lewat target `make verify-arch` sebelum push.
#
# Compose file:
#   compose.yaml   → build lokal (default)
#   build.compose  → build CI/CD
#   make build COMPOSE_FILE=build.compose
# ============================================================

SHELL := /bin/sh

ORG_REGISTRY ?= newrahmat
IMAGE_NAME   ?= p2s-app
IMAGE_TAG    ?= latest
ENV          ?= production
PORT         ?= 8080
PLATFORM     ?= linux/amd64

PUBLIC_PB_URL  ?=
PUBLIC_API_URL ?=

COMPOSE_FILE ?= compose.yaml
ENV_FILE     := .env.$(ENV)

.PHONY: help build release push run down staging production check-env verify-arch

## Tampilkan bantuan
help:
	@echo ""
	@echo "p2s-app — Docker build/release"
	@echo "=========================================================="
	@echo "  Image : $(ORG_REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)"
	@echo ""
	@echo "Usage: make <target> [ENV=<env>] [IMAGE_TAG=<tag>]"
	@echo ""
	@echo "  make build                   Build image"
	@echo "  make release                 Build + push image"
	@echo "  make run                     Build + jalankan container (port $(PORT))"
	@echo "  make down                    Stop container"
	@echo "  make verify-arch             Cek arsitektur image (wajib linux/amd64)"
	@echo "  make staging                 Full flow staging (build + release)"
	@echo "  make production              Full flow production (build + release)"
	@echo "  make help                    Bantuan ini"
	@echo ""
	@echo "CI/CD: make build COMPOSE_FILE=build.compose"
	@echo ""

## Full flow: staging (build + release)
staging:
	@$(MAKE) build ENV=staging
	@$(MAKE) release ENV=staging

## Full flow: production (build + release)
production:
	@$(MAKE) build ENV=production
	@$(MAKE) release ENV=production

## Validasi file .env.{ENV} (warning only)
check-env:
	@if [ ! -f "${ENV_FILE}" ]; then \
		echo ">> ⚠️  ${ENV_FILE} tidak ditemukan (pakai default vite.config.ts)"; \
	fi

## Build image Docker
build:
	@echo ">> Build $(ENV): $(ORG_REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) (compose: $(COMPOSE_FILE))"
	ORG_REGISTRY=$(ORG_REGISTRY) IMAGE_NAME=$(IMAGE_NAME) IMAGE_TAG=$(IMAGE_TAG) \
	BUILD_ENV=$(ENV) PORT=$(PORT) PLATFORM=$(PLATFORM) \
	PUBLIC_PB_URL=$(PUBLIC_PB_URL) PUBLIC_API_URL=$(PUBLIC_API_URL) \
		docker compose -f $(COMPOSE_FILE) build

## Push image ke registry
push:
	@echo ">> Push $(ORG_REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)"
	ORG_REGISTRY=$(ORG_REGISTRY) IMAGE_NAME=$(IMAGE_NAME) IMAGE_TAG=$(IMAGE_TAG) \
	BUILD_ENV=$(ENV) \
		docker compose -f $(COMPOSE_FILE) push

## Build + push image ke registry
release:
	@$(MAKE) build
	@$(MAKE) verify-arch
	@$(MAKE) push

## Pastikan image hasil build benar-benar linux/amd64
verify-arch:
	@IMG=$(ORG_REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG); \
	ARCH=$$(docker image inspect $$IMG --format '{{.Os}}/{{.Architecture}}' 2>/dev/null); \
	if [ "$$ARCH" != "linux/amd64" ]; then \
		echo ">> ERROR: $$IMG = '$$ARCH', wajib linux/amd64"; \
		exit 1; \
	fi; \
	echo ">> OK: $$IMG = $$ARCH"

## Build + jalankan container
run: check-env
	@echo ">> Run $(ENV): $(ORG_REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) on port $(PORT)"
	ORG_REGISTRY=$(ORG_REGISTRY) IMAGE_NAME=$(IMAGE_NAME) IMAGE_TAG=$(IMAGE_TAG) \
	BUILD_ENV=$(ENV) PORT=$(PORT) \
	PUBLIC_PB_URL=$(PUBLIC_PB_URL) PUBLIC_API_URL=$(PUBLIC_API_URL) \
		docker compose -f $(COMPOSE_FILE) up -d

## Stop container
down:
	docker compose -f $(COMPOSE_FILE) down 2>/dev/null || true
