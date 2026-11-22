#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "Operação 30"
echo "No celular, use o mesmo Wi-Fi e abra um destes endereços:"
hostname -I 2>/dev/null | tr ' ' '\n' | sed '/^$/d' | while read -r ip; do
  echo "  http://${ip}:8080"
done
echo ""
echo "Para instalar: no Chrome, Adicionar à tela inicial."
echo "No iPhone: Compartilhar, Adicionar à Tela de Início."
echo ""
exec python3 -m http.server 8080 --bind 0.0.0.0
