@echo off
title Podpis dokumentov - vypnutie
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop.ps1"
