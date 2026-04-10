document.getElementById('btn-buscar').addEventListener('click', buscar);
document.getElementById('termo-codigo').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') buscar();
});

let raios = [];
for (let i = 0; i <= 20; i++) {
    raios.push({i: i + ' km'});
}
const raioFilter = raios;

const dataFilter = [
    {"-1": 'Últimos 2 meses'},
    {"1": 'Últimos 15 dias'},
    {"2": 'Última semana'},
    {"3": 'Últimas 24 horas'},
    {"4": 'Últimas 12 horas'},
    {"5": 'Últimas 6 horas'},
    {"6": 'Última hora'}
];

const sortOrders = [
    {"0": "Menor preço"},
    {"1": "Distância"},
    {"2": "Data da venda"},
    {"3": "Maior preço"}
]

// Scanner controls
let html5QrcodeScanner = null;
const scannerModal = document.getElementById('scanner-modal');
const scannerStatus = document.getElementById('scanner-status');
let scanned = false;

document.getElementById('btn-scanner').addEventListener('click', abrirScanner);
document.getElementById('scanner-close').addEventListener('click', fecharScanner);
scannerModal.addEventListener('click', function (e) {
    if (e.target === scannerModal) fecharScanner();
});

function abrirScanner() {
    scannerModal.classList.add('active');
    scannerStatus.textContent = '';

    html5QrcodeScanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
        ]
    });

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 100 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: true
    };

    html5QrcodeScanner
        .start(
            { facingMode: 'environment' },
            config,
            function onScanSuccess(decodedText, decodedResult) {
                document.getElementById('termo-codigo').value = decodedText;
                scannerStatus.textContent = 'Código lido com sucesso!';
                scannerStatus.className = 'scanner-status success';
                scanned = true;

                setTimeout(() => {
                    fecharScanner();
                    buscar();
                }, 500);
            },
            function onScanError(error) {
                // Silently handle scan errors
            }
        )
        .catch(function (err) {
            scannerStatus.textContent = 'Erro ao iniciar câmera: ' + err.message;
            scannerStatus.className = 'scanner-status error';
            scanned = false;
        });
}

function fecharScanner() {
    scannerModal.classList.remove('active');
    if (html5QrcodeScanner) {
        html5QrcodeScanner
            .stop()
            .catch(function (err) {
                console.error('Erro ao parar o scanner:', err);
            });
        html5QrcodeScanner = null;
    }
}

var LOCAL_ID = '6gdz0n7rz';
var SEARCH_RAIO = 20;
var DATE_FILTER = -1;
var SORT_ORDER = 0;
var OFFSET = 0;

function isValidGTIN(gtin) {
    const gtinLength = gtin.length;
    return gtinLength === 8 || gtinLength === 12 || gtinLength === 13 || gtinLength === 14;
}

function buscar() {
    var codigoBarras = document.getElementById('termo-codigo').value.trim();
    var resultadoDiv = document.getElementById('resultado');

    if (!codigoBarras) {
        mostrarErro(resultadoDiv, 'Por favor, informe o termo ou o código de barras.');
        return;
    }

    const loaderModal = document.getElementById("loader-modal");
    loaderModal.classList.add('active');
    resultadoDiv.textContent = 'Buscando…';

    const tipoBusca = isValidGTIN(codigoBarras) || scanned ? 'gtin' : 'termo';

    var url =
        'https://menorpreco.notaparana.pr.gov.br/api/v1/produtos' +
        '?local=' + LOCAL_ID +
        '&offset=' + OFFSET +
        '&raio=' + SEARCH_RAIO +
        '&' + tipoBusca + '=' + encodeURIComponent(codigoBarras) +
        '&data=' + DATE_FILTER +
        '&ordem=' + SORT_ORDER;

    fetch(url)
        .then(function (response) {
            if (!response.ok) {
                var msg = 'Erro na requisição: ' + response.status;
                if (response.status === 404) {
                    msg = 'Produto não encontrado (código inválido ou não cadastrado).';
                } else if (response.status >= 500) {
                    msg = 'Erro no servidor. Tente novamente mais tarde.';
                }
                throw new Error(msg);
            }
            return response.json();
        })
        .then(function (data) {
            exibirResultado(data);
        })
        .catch(function (err) {
            mostrarErro(resultadoDiv, 'Não foi possível obter o resultado: ' + err.message);
        }).finally(function () {
            loaderModal.classList.remove('active');
        });
}

function mostrarErro(container, mensagem) {
    var span = document.createElement('span');
    span.className = 'erro';
    span.textContent = mensagem;
    container.innerHTML = '';
    container.appendChild(span);
}

function exibirResultado(data) {
    var resultadoDiv = document.getElementById('resultado');

    if (!data || !data.produtos || data.produtos.length === 0) {
        var semResultados = document.createElement('div');
        semResultados.className = 'sem-resultados';
        semResultados.textContent = 'Nenhum produto encontrado para este código de barras.';
        resultadoDiv.innerHTML = '';
        resultadoDiv.appendChild(semResultados);
        return;
    }

    resultadoDiv.innerHTML = '';

    var infoHeader = document.createElement('div');
    infoHeader.className = 'info-header';

    if (data.tempo) {
        var tempoDiv = document.createElement('div');
        tempoDiv.textContent = 'Tempo de busca: ' + data.tempo + 'ms';
        infoHeader.appendChild(tempoDiv);
    }

    if (data.total) {
        var totalDiv = document.createElement('div');
        totalDiv.textContent = 'Total de resultados: ' + data.total;
        infoHeader.appendChild(totalDiv);
    }

    if (data.precos) {
        var precosDiv = document.createElement('div');
        precosDiv.className = 'price-range';
        var precoMin = parseFloat(data.precos.min);
        var precoMax = parseFloat(data.precos.max);
        precosDiv.textContent = 'Faixa de preço: R$ ' + precoMin.toFixed(2) + ' a R$ ' + precoMax.toFixed(2);
        infoHeader.appendChild(precosDiv);
    }

    resultadoDiv.appendChild(infoHeader);

    data.produtos.forEach(function (produto) {
        var div = document.createElement('div');
        div.className = 'produto';

        var nome = document.createElement('div');
        nome.className = 'produto-nome';
        nome.textContent = produto.desc || 'Produto sem descrição';
        div.appendChild(nome);

        var precoContainer = document.createElement('div');
        precoContainer.className = 'produto-preco-container';

        if (produto.valor) {
            var valorDiv = document.createElement('div');
            valorDiv.className = 'preco-item';
            var valorLabel = document.createElement('div');
            valorLabel.className = 'preco-label';
            valorLabel.textContent = 'Preço Final';
            var valorValor = document.createElement('div');
            valorValor.className = 'preco-valor';
            valorValor.textContent = 'R$ ' + parseFloat(produto.valor).toFixed(2);
            valorDiv.appendChild(valorLabel);
            valorDiv.appendChild(valorValor);
            precoContainer.appendChild(valorDiv);
        }

        if (produto.valor_desconto && produto.valor_desconto !== '0.00') {
            var descontoDiv = document.createElement('div');
            descontoDiv.className = 'preco-item';
            var descontoLabel = document.createElement('div');
            descontoLabel.className = 'preco-label';
            descontoLabel.textContent = 'Desconto';
            var descontoValor = document.createElement('div');
            descontoValor.className = 'preco-valor preco-desconto';
            descontoValor.textContent = 'R$ ' + parseFloat(produto.valor_desconto).toFixed(2);
            descontoDiv.appendChild(descontoLabel);
            descontoDiv.appendChild(descontoValor);
            precoContainer.appendChild(descontoDiv);
        }

        if (produto.valor_tabela) {
            var tabelaDiv = document.createElement('div');
            tabelaDiv.className = 'preco-item';
            var tabelaLabel = document.createElement('div');
            tabelaLabel.className = 'preco-label';
            tabelaLabel.textContent = 'Preço Tabela';
            var tabelaValor = document.createElement('div');
            tabelaValor.className = 'preco-valor';
            tabelaValor.style.color = '#999';
            tabelaValor.style.textDecoration = 'line-through';
            tabelaValor.textContent = 'R$ ' + parseFloat(produto.valor_tabela).toFixed(2);
            tabelaDiv.appendChild(tabelaLabel);
            tabelaDiv.appendChild(tabelaValor);
            precoContainer.appendChild(tabelaDiv);
        }

        if (precoContainer.children.length > 0) {
            div.appendChild(precoContainer);
        }

        var detalhes = document.createElement('div');
        detalhes.className = 'produto-detalhes';
        var detalhesHTML = '';

        if (produto.tempo) {
            detalhesHTML += '<strong>Atualização:</strong> ' + produto.tempo + '<br>';
        }

        if (produto.distkm) {
            detalhesHTML += '<strong>Distância:</strong> ' + parseFloat(produto.distkm).toFixed(3) + ' km<br>';
        }

        if (produto.gtin) {
            detalhesHTML += '<strong>GTIN:</strong> ' + produto.gtin + '<br>';
        }

        if (detalhesHTML) {
            detalhes.innerHTML = detalhesHTML;
            div.appendChild(detalhes);
        }

        if (produto.estabelecimento) {
            var est = produto.estabelecimento;

            // Container para botão e estabelecimento
            var estContainer = document.createElement('div');
            estContainer.className = 'estabelecimento-container';

            // Botão de navegação
            var navButton = document.createElement('a');
            navButton.className = 'estabelecimento-nav-btn';
            navButton.title = 'Navegar até o estabelecimento';
            navButton.innerHTML = '<i class="fa-solid fa-location-arrow"></i>';

            // Construir endereço completo para navegação
            var enderecoCompleto = '';
            if (est.tp_logr) enderecoCompleto += est.tp_logr + ' ';
            if (est.nm_logr) enderecoCompleto += est.nm_logr;
            if (est.nr_logr) enderecoCompleto += ', ' + est.nr_logr;
            if (est.bairro) enderecoCompleto += ', ' + est.bairro;
            if (est.mun) enderecoCompleto += ', ' + est.mun;
            if (est.uf) enderecoCompleto += ', ' + est.uf;

            // Link para Google Maps
            navButton.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(enderecoCompleto);
            navButton.target = '_blank';

            estContainer.appendChild(navButton);

            var estDiv = document.createElement('div');
            estDiv.className = 'estabelecimento';

            var estNome = document.createElement('div');
            estNome.className = 'estabelecimento-nome';
            estNome.textContent = est.nm_fan || est.nm_emp || 'Estabelecimento desconhecido';
            estDiv.appendChild(estNome);

            var estEnd = document.createElement('div');
            estEnd.className = 'estabelecimento-endereco';
            var endTexto = '';
            if (est.tp_logr) endTexto += est.tp_logr + ' ';
            if (est.nm_logr) endTexto += est.nm_logr;
            if (est.nr_logr) endTexto += ', ' + est.nr_logr;
            if (est.bairro) endTexto += ' - ' + est.bairro;
            if (est.mun) endTexto += ' - ' + est.mun;
            if (est.uf) endTexto += ' (' + est.uf + ')';
            estEnd.textContent = endTexto;
            estDiv.appendChild(estEnd);

            estContainer.appendChild(estDiv);
            div.appendChild(estContainer);
        }

        resultadoDiv.appendChild(div);
    });
}