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
        // aspectRatio: 1.0,
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

let LOCAL_ID = '6gdz0n7rz';
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

function getCities() {
    const listaCidades = ["Abatiá", "Adrianópolis", "Agudos do Sul", "Almirante Tamandaré", "Altamira do Paraná", "Alto Paraná", "Alto Piquiri", "Altônia", "Alvorada do Sul", "Amaporã", "Ampére", "Anahy", "Andirá", "Ângulo", "Antonina", "Antônio Olinto", "Apucarana", "Arapongas", "Arapoti", "Arapuã", "Araruna", "Araucária", "Ariranha do Ivaí", "Assaí", "Assis Chateaubriand", "Astorga", "Atalaia", "Balsa Nova", "Bandeirantes", "Barbosa Ferraz", "Barra do Jacaré", "Barracão", "Bela Vista da Caroba", "Bela Vista do Paraíso", "Bituruna", "Boa Esperança", "Boa Esperança do Iguaçu", "Boa Ventura de São Roque", "Boa Vista da Aparecida", "Bocaiúva do Sul", "Bom Jesus do Sul", "Bom Sucesso", "Bom Sucesso do Sul", "Borrazópolis", "Braganey", "Brasilândia do Sul", "Cafeara", "Cafelândia", "Cafezal do Sul", "Califórnia", "Cambará", "Cambé", "Cambira", "Campina da Lagoa", "Campina do Simão", "Campina Grande do Sul", "Campo Bonito", "Campo do Tenente", "Campo Largo", "Campo Magro", "Campo Mourão", "Cândido de Abreu", "Candói", "Cantagalo", "Capanema", "Capitão Leônidas Marques", "Carambeí", "Carlópolis", "Cascavel", "Castro", "Catanduvas", "Centenário do Sul", "Cerro Azul", "Céu Azul", "Chopinzinho", "Cianorte", "Cidade Gaúcha", "Clevelândia", "Colombo", "Colorado", "Congonhinhas", "Conselheiro Mairinck", "Contenda", "Corbélia", "Cornélio Procópio", "Coronel Domingos Soares", "Coronel Vivida", "Corumbataí do Sul", "Cruz Machado", "Cruzeiro do Iguaçu", "Cruzeiro do Oeste", "Cruzeiro do Sul", "Cruzmaltina", "Curitiba", "Curiúva", "Diamante d'Oeste", "Diamante do Norte", "Diamante do Sul", "Dois Vizinhos", "Douradina", "Doutor Camargo", "Doutor Ulysses", "Enéas Marques", "Engenheiro Beltrão", "Entre Rios do Oeste", "Esperança Nova", "Espigão Alto do Iguaçu", "Farol", "Faxinal", "Fazenda Rio Grande", "Fênix", "Fernandes Pinheiro", "Figueira", "Flor da Serra do Sul", "Floraí", "Floresta", "Florestópolis", "Flórida", "Formosa do Oeste", "Foz do Iguaçu", "Foz do Jordão", "Francisco Alves", "Francisco Beltrão", "General Carneiro", "Godoy Moreira", "Goioerê", "Goioxim", "Grandes Rios", "Guaíra", "Guairaçá", "Guamiranga", "Guapirama", "Guaporema", "Guaraci", "Guaraniaçu", "Guarapuava", "Guaraqueçaba", "Guaratuba", "Honório Serpa", "Ibaiti", "Ibema", "Ibiporã", "Icaraíma", "Iguaraçu", "Iguatu", "Imbaú", "Imbituva", "Inácio Martins", "Inajá", "Indianópolis", "Ipiranga", "Iporã", "Iracema do Oeste", "Irati", "Iretama", "Itaguajé", "Itaipulândia", "Itambaracá", "Itambé", "Itapejara d'Oeste", "Itaperuçu", "Itaúna do Sul", "Ivaí", "Ivaiporã", "Ivaté", "Ivatuba", "Jaboti", "Jacarezinho", "Jaguapitã", "Jaguariaíva", "Jandaia do Sul", "Janiópolis", "Japira", "Japurá", "Jardim Alegre", "Jardim Olinda", "Jataizinho", "Jesuítas", "Joaquim Távora", "Jundiaí do Sul", "Juranda", "Jussara", "Kaloré", "Lapa", "Laranjal", "Laranjeiras do Sul", "Leópolis", "Lidianópolis", "Lindoeste", "Loanda", "Lobato", "Londrina", "Luiziana", "Lunardelli", "Lupionópolis", "Mallet", "Mamborê", "Mandaguaçu", "Mandaguari", "Mandirituba", "Manfrinópolis", "Mangueirinha", "Manoel Ribas", "Marechal Cândido Rondon", "Maria Helena", "Marialva", "Marilândia do Sul", "Marilena", "Mariluz", "Maringá", "Mariópolis", "Maripá", "Marmeleiro", "Marquinho", "Marumbi", "Matelândia", "Matinhos", "Mato Rico", "Mauá da Serra", "Medianeira", "Mercedes", "Mirador", "Miraselva", "Missal", "Moreira Sales", "Morretes", "Munhoz de Melo", "Nossa Senhora das Graças", "Nova Aliança do Ivaí", "Nova América da Colina", "Nova Aurora", "Nova Cantu", "Nova Esperança", "Nova Esperança do Sudoeste", "Nova Fátima", "Nova Laranjeiras", "Nova Londrina", "Nova Olímpia", "Nova Prata do Iguaçu", "Nova Santa Bárbara", "Nova Santa Rosa", "Nova Tebas", "Novo Itacolomi", "Ortigueira", "Ourizona", "Ouro Verde do Oeste", "Paiçandu", "Palmas", "Palmeira", "Palmital", "Palotina", "Paraíso do Norte", "Paranacity", "Paranaguá", "Paranapoema", "Paranavaí", "Pato Bragado", "Pato Branco", "Paula Freitas", "Paulo Frontin", "Peabiru", "Perobal", "Pérola", "Pérola d'Oeste", "Piên", "Pinhais", "Pinhal de São Bento", "Pinhalão", "Pinhão", "Piraí do Sul", "Piraquara", "Pitanga", "Pitangueiras", "Planaltina do Paraná", "Planalto", "Ponta Grossa", "Pontal do Paraná", "Porecatu", "Porto Amazonas", "Porto Barreiro", "Porto Rico", "Porto Vitória", "Prado Ferreira", "Pranchita", "Presidente Castelo Branco", "Primeiro de Maio", "Prudentópolis", "Quarto Centenário", "Quatiguá", "Quatro Barras", "Quatro Pontes", "Quedas do Iguaçu", "Querência do Norte", "Quinta do Sol", "Quitandinha", "Ramilândia", "Rancho Alegre", "Rancho Alegre d'Oeste", "Realeza", "Rebouças", "Renascença", "Reserva", "Reserva do Iguaçu", "Ribeirão Claro", "Ribeirão do Pinhal", "Rio Azul", "Rio Bom", "Rio Bonito do Iguaçu", "Rio Branco do Ivaí", "Rio Branco do Sul", "Rio Negro", "Rolândia", "Roncador", "Rondon", "Rosário do Ivaí", "Sabáudia", "Salgado Filho", "Salto do Itararé", "Salto do Lontra", "Santa Amélia", "Santa Cecília do Pavão", "Santa Cruz Monte Castelo", "Santa Fé", "Santa Helena", "Santa Inês", "Santa Isabel do Ivaí", "Santa Izabel do Oeste", "Santa Lúcia", "Santa Maria do Oeste", "Santa Mariana", "Santa Mônica", "Santa Tereza do Oeste", "Santa Terezinha de Itaipu", "Santana do Itararé", "Santo Antônio da Platina", "Santo Antônio do Caiuá", "Santo Antônio do Paraíso", "Santo Antônio do Sudoeste", "Santo Inácio", "São Carlos do Ivaí", "São Jerônimo da Serra", "São João", "São João do Caiuá", "São João do Ivaí", "São João do Triunfo", "São Jorge d'Oeste", "São Jorge do Ivaí", "São Jorge do Patrocínio", "São José da Boa Vista", "São José das Palmeiras", "São José dos Pinhais", "São Manoel do Paraná", "São Mateus do Sul", "São Miguel do Iguaçu", "São Pedro do Iguaçu", "São Pedro do Ivaí", "São Pedro do Paraná", "São Sebastião da Amoreira", "São Tomé", "Sapopema", "Sarandi", "Saudade do Iguaçu", "Sengés", "Serranópolis do Iguaçu", "Sertaneja", "Sertanópolis", "Siqueira Campos", "Sulina", "Tamarana", "Tamboara", "Tapejara", "Tapira", "Teixeira Soares", "Telêmaco Borba", "Terra Boa", "Terra Rica", "Terra Roxa", "Tibagi", "Tijucas do Sul", "Toledo", "Tomazina", "Três Barras do Paraná", "Tunas do Paraná", "Tuneiras do Oeste", "Tupãssi", "Turvo", "Ubiratã", "Umuarama", "União da Vitória", "Uniflor", "Uraí", "Ventania", "Vera Cruz do Oeste", "Verê", "Vila Alta", "Virmond", "Vitorino", "Wenceslau Braz", "Xambrê"];
    return listaCidades;
}

async function loadCities() {
    const select = document.getElementById("cidade");

    // Você pode trocar por fetch da sua API
    const cities = ["Abatiá", "Adrianópolis", "Agudos do Sul", "Almirante Tamandaré", "Altamira do Paraná", "Alto Paraná", "Alto Piquiri", "Altônia", "Alvorada do Sul", "Amaporã", "Ampére", "Anahy", "Andirá", "Ângulo", "Antonina", "Antônio Olinto", "Apucarana", "Arapongas", "Arapoti", "Arapuã", "Araruna", "Araucária", "Ariranha do Ivaí", "Assaí", "Assis Chateaubriand", "Astorga", "Atalaia", "Balsa Nova", "Bandeirantes", "Barbosa Ferraz", "Barra do Jacaré", "Barracão", "Bela Vista da Caroba", "Bela Vista do Paraíso", "Bituruna", "Boa Esperança", "Boa Esperança do Iguaçu", "Boa Ventura de São Roque", "Boa Vista da Aparecida", "Bocaiúva do Sul", "Bom Jesus do Sul", "Bom Sucesso", "Bom Sucesso do Sul", "Borrazópolis", "Braganey", "Brasilândia do Sul", "Cafeara", "Cafelândia", "Cafezal do Sul", "Califórnia", "Cambará", "Cambé", "Cambira", "Campina da Lagoa", "Campina do Simão", "Campina Grande do Sul", "Campo Bonito", "Campo do Tenente", "Campo Largo", "Campo Magro", "Campo Mourão", "Cândido de Abreu", "Candói", "Cantagalo", "Capanema", "Capitão Leônidas Marques", "Carambeí", "Carlópolis", "Cascavel", "Castro", "Catanduvas", "Centenário do Sul", "Cerro Azul", "Céu Azul", "Chopinzinho", "Cianorte", "Cidade Gaúcha", "Clevelândia", "Colombo", "Colorado", "Congonhinhas", "Conselheiro Mairinck", "Contenda", "Corbélia", "Cornélio Procópio", "Coronel Domingos Soares", "Coronel Vivida", "Corumbataí do Sul", "Cruz Machado", "Cruzeiro do Iguaçu", "Cruzeiro do Oeste", "Cruzeiro do Sul", "Cruzmaltina", "Curitiba", "Curiúva", "Diamante d'Oeste", "Diamante do Norte", "Diamante do Sul", "Dois Vizinhos", "Douradina", "Doutor Camargo", "Doutor Ulysses", "Enéas Marques", "Engenheiro Beltrão", "Entre Rios do Oeste", "Esperança Nova", "Espigão Alto do Iguaçu", "Farol", "Faxinal", "Fazenda Rio Grande", "Fênix", "Fernandes Pinheiro", "Figueira", "Flor da Serra do Sul", "Floraí", "Floresta", "Florestópolis", "Flórida", "Formosa do Oeste", "Foz do Iguaçu", "Foz do Jordão", "Francisco Alves", "Francisco Beltrão", "General Carneiro", "Godoy Moreira", "Goioerê", "Goioxim", "Grandes Rios", "Guaíra", "Guairaçá", "Guamiranga", "Guapirama", "Guaporema", "Guaraci", "Guaraniaçu", "Guarapuava", "Guaraqueçaba", "Guaratuba", "Honório Serpa", "Ibaiti", "Ibema", "Ibiporã", "Icaraíma", "Iguaraçu", "Iguatu", "Imbaú", "Imbituva", "Inácio Martins", "Inajá", "Indianópolis", "Ipiranga", "Iporã", "Iracema do Oeste", "Irati", "Iretama", "Itaguajé", "Itaipulândia", "Itambaracá", "Itambé", "Itapejara d'Oeste", "Itaperuçu", "Itaúna do Sul", "Ivaí", "Ivaiporã", "Ivaté", "Ivatuba", "Jaboti", "Jacarezinho", "Jaguapitã", "Jaguariaíva", "Jandaia do Sul", "Janiópolis", "Japira", "Japurá", "Jardim Alegre", "Jardim Olinda", "Jataizinho", "Jesuítas", "Joaquim Távora", "Jundiaí do Sul", "Juranda", "Jussara", "Kaloré", "Lapa", "Laranjal", "Laranjeiras do Sul", "Leópolis", "Lidianópolis", "Lindoeste", "Loanda", "Lobato", "Londrina", "Luiziana", "Lunardelli", "Lupionópolis", "Mallet", "Mamborê", "Mandaguaçu", "Mandaguari", "Mandirituba", "Manfrinópolis", "Mangueirinha", "Manoel Ribas", "Marechal Cândido Rondon", "Maria Helena", "Marialva", "Marilândia do Sul", "Marilena", "Mariluz", "Maringá", "Mariópolis", "Maripá", "Marmeleiro", "Marquinho", "Marumbi", "Matelândia", "Matinhos", "Mato Rico", "Mauá da Serra", "Medianeira", "Mercedes", "Mirador", "Miraselva", "Missal", "Moreira Sales", "Morretes", "Munhoz de Melo", "Nossa Senhora das Graças", "Nova Aliança do Ivaí", "Nova América da Colina", "Nova Aurora", "Nova Cantu", "Nova Esperança", "Nova Esperança do Sudoeste", "Nova Fátima", "Nova Laranjeiras", "Nova Londrina", "Nova Olímpia", "Nova Prata do Iguaçu", "Nova Santa Bárbara", "Nova Santa Rosa", "Nova Tebas", "Novo Itacolomi", "Ortigueira", "Ourizona", "Ouro Verde do Oeste", "Paiçandu", "Palmas", "Palmeira", "Palmital", "Palotina", "Paraíso do Norte", "Paranacity", "Paranaguá", "Paranapoema", "Paranavaí", "Pato Bragado", "Pato Branco", "Paula Freitas", "Paulo Frontin", "Peabiru", "Perobal", "Pérola", "Pérola d'Oeste", "Piên", "Pinhais", "Pinhal de São Bento", "Pinhalão", "Pinhão", "Piraí do Sul", "Piraquara", "Pitanga", "Pitangueiras", "Planaltina do Paraná", "Planalto", "Ponta Grossa", "Pontal do Paraná", "Porecatu", "Porto Amazonas", "Porto Barreiro", "Porto Rico", "Porto Vitória", "Prado Ferreira", "Pranchita", "Presidente Castelo Branco", "Primeiro de Maio", "Prudentópolis", "Quarto Centenário", "Quatiguá", "Quatro Barras", "Quatro Pontes", "Quedas do Iguaçu", "Querência do Norte", "Quinta do Sol", "Quitandinha", "Ramilândia", "Rancho Alegre", "Rancho Alegre d'Oeste", "Realeza", "Rebouças", "Renascença", "Reserva", "Reserva do Iguaçu", "Ribeirão Claro", "Ribeirão do Pinhal", "Rio Azul", "Rio Bom", "Rio Bonito do Iguaçu", "Rio Branco do Ivaí", "Rio Branco do Sul", "Rio Negro", "Rolândia", "Roncador", "Rondon", "Rosário do Ivaí", "Sabáudia", "Salgado Filho", "Salto do Itararé", "Salto do Lontra", "Santa Amélia", "Santa Cecília do Pavão", "Santa Cruz Monte Castelo", "Santa Fé", "Santa Helena", "Santa Inês", "Santa Isabel do Ivaí", "Santa Izabel do Oeste", "Santa Lúcia", "Santa Maria do Oeste", "Santa Mariana", "Santa Mônica", "Santa Tereza do Oeste", "Santa Terezinha de Itaipu", "Santana do Itararé", "Santo Antônio da Platina", "Santo Antônio do Caiuá", "Santo Antônio do Paraíso", "Santo Antônio do Sudoeste", "Santo Inácio", "São Carlos do Ivaí", "São Jerônimo da Serra", "São João", "São João do Caiuá", "São João do Ivaí", "São João do Triunfo", "São Jorge d'Oeste", "São Jorge do Ivaí", "São Jorge do Patrocínio", "São José da Boa Vista", "São José das Palmeiras", "São José dos Pinhais", "São Manoel do Paraná", "São Mateus do Sul", "São Miguel do Iguaçu", "São Pedro do Iguaçu", "São Pedro do Ivaí", "São Pedro do Paraná", "São Sebastião da Amoreira", "São Tomé", "Sapopema", "Sarandi", "Saudade do Iguaçu", "Sengés", "Serranópolis do Iguaçu", "Sertaneja", "Sertanópolis", "Siqueira Campos", "Sulina", "Tamarana", "Tamboara", "Tapejara", "Tapira", "Teixeira Soares", "Telêmaco Borba", "Terra Boa", "Terra Rica", "Terra Roxa", "Tibagi", "Tijucas do Sul", "Toledo", "Tomazina", "Três Barras do Paraná", "Tunas do Paraná", "Tuneiras do Oeste", "Tupãssi", "Turvo", "Ubiratã", "Umuarama", "União da Vitória", "Uniflor", "Uraí", "Ventania", "Vera Cruz do Oeste", "Verê", "Vila Alta", "Virmond", "Vitorino", "Wenceslau Braz", "Xambrê"];

    cities.forEach(city => {
        const opt = document.createElement("option");
        opt.value = city;
        opt.textContent = city;
        select.appendChild(opt);
    });

    // valor padrão
    select.value = "Campo Mourão";

    fetchData(select.value);

    select.addEventListener("change", (e) => {
        fetchData(e.target.value);
    });
}

async function fetchData(regiao) {
    const url = `https://menorpreco.notaparana.pr.gov.br/mapa/search?regiao=${encodeURIComponent(regiao)}`;

    const response = await fetch(url, {
        headers: {
            "Accept": "application/json, text/plain, */*"
        }
    });

    const data = await response.json();
    LOCAL_ID = data[0].geohash;
}

loadCities();
