FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY servidor/requirements.txt /app/servidor/requirements.txt
RUN --mount=type=secret,id=ca_cert,target=/tmp/ca.pem \
    if [ -f /tmp/ca.pem ]; then export PIP_CERT=/tmp/ca.pem; fi; \
    pip install --no-cache-dir -r servidor/requirements.txt && useradd --create-home flow && mkdir -p /dados && chown flow:flow /dados
COPY --chown=flow:flow servidor /app/servidor
COPY --chown=flow:flow executores/__init__.py executores/contratos.py /app/executores/
COPY --chown=flow:flow conteudos /app/conteudos
USER flow
ENV DATABASE_URL=sqlite:////dados/flow.db
EXPOSE 8000
CMD ["sh", "-c", "python -m uvicorn servidor.principal:app --host 0.0.0.0 --port ${PORT:-8000}"]
