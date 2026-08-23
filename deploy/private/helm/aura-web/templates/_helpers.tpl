{{- define "aura-web.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "aura-web.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "aura-web.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "aura-web.labels" -}}
app.kubernetes.io/name: {{ include "aura-web.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
aura.m2mtechconnect.com/release-status: scaffold-not-release-qualified
{{- end -}}

{{- define "aura-web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "aura-web.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
