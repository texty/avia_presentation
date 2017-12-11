d3.json('avia_table.json', function(error, dataset) {
    if (error) {
        throw error;
    }

    // Get list of all airlines
    var airline_names = [], airline_icao_iata = [], airlines_data = [];

    dataset.map(function (d) {
        d.conditions.map(function (c) {
            c.permissions.map(function (p) {
                p.rights.map(function (r) {
                    if (airline_names.indexOf(r.airline_name) < 0) {
                        airline_names.push(r.airline_name);
                    }
                    var icao_iata = [r.icao_airline, r.iata_airline].join('_');
                    if (airline_icao_iata.indexOf(icao_iata) < 0) {
                        airline_icao_iata.push(icao_iata);
                    }
                })
            })
        })
    });
    airline_names.map(function (d, i) {
        var aname_new = '';
        switch (d) {
            case 'МАУ':
                aname_new = 'Міжнародні авіалінії України';
                break;
            case 'ЯнЕір ЛТД':
                aname_new = 'YanAir';
                break;
            case 'АТЛАСДЖЕТ УКРАЇНА':
                aname_new = 'AtlasGlobal UA';
                break;
            case 'РОЗА ВІТРІВ':
                aname_new = 'Wind Rose';
                break;
            case 'ДАРТ':
                aname_new = 'DART';
                break;
            case 'Українсько-середземноморські авіалінії':
                aname_new = 'UM Air';
                break;
            default: aname_new = d;
        }
        airlines_data.push({'airline_name': d, 'icao_iata': airline_icao_iata[i], 'airline_label': aname_new});
    });
    airlines_data.map(function (aline, i) {
        var total_flights = [], total_rights = [];
        dataset.map(function (d) {
            d.conditions.map(function (c) {
                c.permissions.map(function (p) {
                    var a_rights = p.rights.filter(function (r) {
                        return r.airline_name == aline.airline_name;
                    });

                    a_rights.map(function (a_r) {
                        total_rights.push(+a_r.max_freq);
                        if (a_r.schedules) {
                            total_flights.push(+a_r.schedules.freq)
                        }
                    });
                });
            });
        });
        airlines_data[i].total_flights = d3.sum(total_flights);
        airlines_data[i].total_rights = d3.sum(total_rights);
        airlines_data[i].airline_removed = false;
    });
    airlines_data = airlines_data.sort(function (a, b) {
        return d3.descending(a.total_rights, b.total_rights);
    });

    // Get rid of ZetAvia, cause only 2 permissions, no data on FlightRadar, and site tells they fly charters to UAE
    // And no ICAO or IATA codes! How???
    airlines_data = airlines_data.filter(function (d) {
        return d.icao_iata !== '_';
    });

    // sort - change airline_icao_iata and airline_names so that they match amount of permissions
    airline_names = [], airline_icao_iata = [];
    airlines_data.map(function (a) {
        airline_names.push(a.airline_label);
        airline_icao_iata.push(a.icao_iata);
    });

    var dataFilterAirline = function (dset) {

        var selectedAirlines = [];
        airlines_data.map(function (a) {
            if (!a.airline_removed) {
                selectedAirlines.push(a.icao_iata.split('_')[0]);
            }
        });

        var filtered_dset = dset;
        filtered_dset.map(function (country, i) {
            country.conditions.map(function (c, j) {
                filtered_dset[i].conditions[j].permissions.map(function (perm, k) {
                    filtered_dset[i].conditions[j].permissions[k].rights = perm.rights.filter(function (r) {
                        return selectedAirlines.indexOf(r.icao_airline) >= 0;
                    });
                });
                filtered_dset[i].conditions[j].permissions = filtered_dset[i].conditions[j].permissions.filter(function (p) {
                    return p.rights.length > 0;
                });
            });
        });

        return filtered_dset;
    };

    // ---------- sticky header ----------------------------------------------------------------------------------------

    d3.select('#table-header div#search-form')
        .append('input')
        .attr('type', 'text')
        .attr('class', 'typeahead tt-query')
        .attr('id', 'country-input')
        .attr('spellcheck', 'true')
        .attr('autocomplete', 'off')
        .attr('maxlength', 150)
        .attr('placeholder', 'Знайти країну → ');

    var countryIds = [];

    $(document).ready(function () {
        var countryEngine = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.whitespace,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: countryIds
        });

        $('.typeahead').typeahead({
                hint: true,
                highlight: true, /* Enable substring highlighting */
                minLength: 1 /* Specify minimum characters required for showing suggestions */
            },
            {
                name: 'country_search',
                source: countryEngine,
                autoselect: true
            }
        )
    });

    $('.typeahead').on('typeahead:selected typeahead:autocompleted', function (e, val) {
        var selected_country_id = $('div.country-name:contains("' + val + '")').parent().attr('id');
        // click to expand country card
        $('div.country-name:contains("' + val + '")').parent().find('.uncollapse-card a i').click();

        $('.typeahead').typeahead('val', '');
    });

    $('.typeahead').on('keyup', function(e) {
        if(e.which == 13) {
            $(".tt-suggestion:first-child").click();
            $('.typeahead').typeahead('val', '');
        }
    });

    // ----- Dropdown airlines -----

    airlinesFilter = d3.select('div#avia-dropdown-items');

    var select_all_airlines = {
        'airline_name': 'ВСІ',
        'airline_label': 'ВСІ',
        'airline_removed': false,
        'icao_iata': airline_icao_iata
    };

    airlinesFilter.selectAll('label')
        .data([select_all_airlines].concat(airlines_data))
        .enter()
        .append('label')
        .attr('class', function (d) {
            var classes = ['menu-airline', 'pl-sm-3', 'pr-sm-3 pr-1', 'mt-0', 'mr-0', 'mb-0', 'ml-0'];
            if (d.airline_removed) {
                classes.push('airline-removed');
            }
            return classes.join(' ');
        })
        .attr('id', function (d) {
            if (typeof d.icao_iata == 'object') {
                return 'select-all-checkbox';
            }
        })
        .html(
            function (d) {
                return '<i class="fa fa-plane airline-check-tick"></i>' + '  ' +
                    d.airline_label +
                    '<input class="airline-checkbox custom-control-input" type="checkbox" checked autocomplete="off">';
            }
        );

    d3.selectAll('#avia-dropdown-items label.menu-airline')
        .filter(function (d) {
            return d.airline_name !== 'ВСІ';
        })
        .attr('title', function (d) {
            return d.icao_iata.split('_')[0];
        });

    // On check box hide elements with specific attribute "airline", which equals ICAO_IATA
    $('input.airline-checkbox').change(function () {
        $('.card-open .collapse').collapse('hide');

        $(document).ready(function () {
            $('body').scrollTo($('nav#table-header'), {
                offset: -$('nav#table-header').height() - 30,
                duration: 0
            });
        });

        // Get ICAO & IATA codes of checked airline in airline_data
        var airline_id = this.parentNode.__data__.icao_iata;
        // get index of selected airline in iarline_data
        var ad_i = airlines_data.findIndex(function (d) {
            return d.icao_iata === airline_id;
        });

        if (
            (typeof airline_id === 'object') ||
            // or if all airlines unselected, otherwise we will have empty table
            (
                airlines_data.filter(function (a) {  return a.airline_removed === false;  }).length === 1 &&
                airline_id === airlines_data.filter(function (a) {  return a.airline_removed === false;  })[0].icao_iata
            )
        ) {
            // if "Show All" selected set all airlines in dataset to 'removed' = false
            airlines_data.map(function (a, i) {
                airlines_data[i].airline_removed = false;
            });
            // paint all icons to selected
            d3.selectAll('.menu-airline').classed('airline-removed', false);
        } else {
            // if at least one airline is already unselected
            if (airlines_data.some(function (a) {
                return a.airline_removed == true;
            })) {
                // change 'removed' value of selected to opposite
                airlines_data[ad_i].airline_removed = !airlines_data[ad_i].airline_removed;
                // paint airline's icon
                d3.select(this.parentNode).classed('airline-removed', function () {
                    return !d3.select(this).classed('airline-removed');
                });
            } else { // if it is first choice of airline, remove all except for selected
                airlines_data.map(function (a, i) {
                    i == ad_i
                        ? airlines_data[i].airline_removed = false
                        : airlines_data[i].airline_removed = true;
                });
                $(this.parentNode).siblings().each(function () {
                    d3.select(this).classed('airline-removed', true);
                    });
            }
        }

        var selected_airlines = airlines_data.filter(function (a) {
            return a.airline_removed === false;
        });
        var selected_codes = [];
        var selected_names = [];
        selected_airlines.map(function (a) {
            selected_codes.push(a.icao_iata.split('_')[0]);
            selected_names.push(a.airline_label);
        });
        selected_codes = selected_codes.join(', ');
        selected_names = selected_names.join(', ');

        // update values in total
        $('.country-profile-row').each(function () {
            if (typeof airline_id === 'object') {
                $(this).slideDown(750);
            } else {
                var selected_fly = this.__data__.conditions.some(function (c) {
                    return c.permissions.some(function (p) {
                        return p.rights.some(function (r) {
                            return selected_codes.split(', ').indexOf(r.icao_airline) > -1;
                        });
                    });
                });
                if (!selected_fly) {
                    $(this).hide();
                } else {
                    $(this).slideDown(750);
                }
            }
        });

        $('.country-total:visible').each(function (i) {
            var cdata = JSON.parse(JSON.stringify($(this).closest('.country-profile-row').get(0).__data__));
            var totalGiven = [], totalFlights = [];
            cdata.conditions.map(function (c) {
                c.permissions.map(function (p) {
                    p.rights.map(function (r) {
                        if (selected_codes.split(', ').indexOf(r.icao_airline) > -1) {
                            totalGiven.push(+r.max_freq);
                            if (r.schedules) {
                                totalFlights.push(+r.schedules.freq)
                            }
                        }
                    });
                });
            });

            totalGiven = d3.sum(totalGiven);
            totalFlights = d3.sum(totalFlights);

            var newCTotal = d3.select(this)
                .datum([totalGiven, totalFlights])
                .enter();

            d3.select(this).selectAll('rect')
                .transition()
                .duration(500)
                .delay(400)
                .attr('width', function () {
                    return d3.select(this).classed('permission')
                        ? totalWidthscale(totalGiven) + '%'
                        : totalWidthscale(totalFlights) + '%'
                });

            d3.select(this).select('p')
                .text(function (d) {
                    return d[1] > 0
                        ? d[1] + ' за розкладами / видано прав на ' + d[0] + ' р/т'
                        : 'видано прав на ' + d[0] + ' р/т';
                });

        });

        $('div.country-profile-row:visible').sort(function (a, b) {
            return d3.descending(
                $(a).find('.country-total').get(0).__data__[0],
                $(b).find('.country-total').get(0).__data__[0]
            );
        }).hide().appendTo('#table-body').slideDown(500);

        d3.selectAll('div.permission').remove();
        drawPermissions();

        // if all airlines selected - button blank, if not - button classed 'filtered-out'
        if (airlines_data.some(function (a) {
                return a.airline_removed == true;
            })) {

            d3.select('button#dropdownMenuButton')
                .classed('items-filtered-out', true)
                .text(function () {
                    var selected_codes = [];
                    selected_airlines.map(function (a) {  selected_codes.push(a.icao_iata.split('_')[0])  });

                    return selected_airlines.length === 1 || selected_names.length < 25 ? selected_names : selected_codes;
                });

            if (selected_names.length >= 25 && selected_names.split(', ').length > 1) {
                d3.select('div#airline-filter')
                    .attr('title', 'Вибрано ' + selected_names.split(', ').join(',\n'))
                    .attr('data-toggle', 'airline-selected-tooltip')
                    .attr('data-placement', 'bottom')
                    .classed('airline-selected-tooltip', true);
            }

            d3.select('#select-all-checkbox')
                .classed('airline-removed', true);

        } else {
            d3.select('button#dropdownMenuButton')
                .classed('items-filtered-out', false)
                .text('Вибрати авіакомпанії');

            d3.select('#select-all-checkbox')
                .classed('airline-removed', false);

            d3.select('div#airline-filter')
                .attr('title', null)
                .attr('data-toggle', null)
                .attr('data-placement', null)
                .classed('airline-selected-tooltip', false);
        }
    });

    var maxWidthCountryName = {'maxlen': 0, 'encoutry': ''};
    var countryWidthRegular = 0;

    // ---------- Table itself -----------------------------------------------------------------------------------------
    // compute total frequencies
    var computeCountryTotal = function (d_country) {
        var totalGiven = [], totalFlights = [];
        d_country.conditions.map(function (c) {
            c.permissions.map(function (p) {
                p.rights.map(function (r) {
                    totalGiven.push(+r.max_freq);
                    if (r.schedules) {
                        totalFlights.push(+r.schedules.freq)
                    }
                });
            });
        });
        return [d3.sum(totalGiven), d3.sum(totalFlights)];
    };

    var totalWidthscale = d3.scaleLinear()
        .domain([0, 210])
        .range([0, 100])
        .clamp(true);

    var drawTable = function () {
        //[dataset_selected_airlines].map(function () {

        var tableSection = d3.select('#table-body');

        var countryRows = tableSection.selectAll('div')
            .data(dataset)
            .enter()
            .append('div')
            .attr('class', 'row country-profile-row justify-content-end mt-2 mb-3 pt-2')
            .attr('id', function (d) {
                return d.encoutry;
            })
            .style('display', 'none');

        // Country label
        var countryName = countryRows.append('div')
            .attr('class', 'col-auto ml-3 mr-3 text-right country-name')
            .attr('id', function (d) {
                return d.encoutry;
            })
            .html(function (d) {
                countryIds.push(d.uacountry);
                var cname = d.uacountry.split(' ');
                var cname_len = [];
                cname.map(function (c) {  cname_len.push(c.length)  });
                var maxitem = cname_len.indexOf(d3.max(cname_len));
                cname[maxitem] = '<span>' + cname[maxitem] + '</span>';
                return cname.join(' ');

            });

        maxWidthCountryName = {'maxlen': 0, 'encoutry': ''};
        dataset.map(function (d) {
            var cname = d.uacountry.split(' ');
            cname = cname.reduce(function(longest, currentWord) {
                return currentWord.length > longest.length ? currentWord : longest;
            }, "");
            if (maxWidthCountryName.maxlen < cname.length) {
                maxWidthCountryName.maxlen = cname.length;
                maxWidthCountryName.encoutry = d.encoutry;
            }
        });

        var countryTotalDiv = countryRows.append('div')
            .datum(function (d) {  return computeCountryTotal(d);  })
            .attr('class', 'col country-total mt-1');

        var countryTotal = countryTotalDiv.filter(function (d) {  return d[0] > 0;  })
            .append('a')
            .attr('data-toggle', 'collapse')
            .attr('href', function (d) {
                return '#collapse-card' + $(this).closest('.country-profile-row').get(0).__data__.encoutry;
            })
            .attr('aria-expanded', 'false')
            .attr('aria-controls', function (d) {
                return 'collapse-card' + $(this).closest('.country-profile-row').get(0).__data__.encoutry;
            })
            .append('svg')
            .attr('width', '100%')
            .attr('height', '1em');

        var countryTotalRect = countryTotal.selectAll('rect')
            .data(function (d) {  return d;
            })
            .enter()
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', '1em')
            .attr('width', function (d) {
                return totalWidthscale(d) + '%'
            })
            .attr('class', function (d, i) {
                var classes = ['total-country-frequency'];
                i > 0 ? classes.push('flight') : classes.push('permission');
                return classes.join(' ');
            });

        var openSkyBadge = '<span class="badge badge-pill badge-default ml-2 open_sky_badge">Відкрите небо</span>';

        var countryTotalLab = countryTotalDiv.append('p')
            .attr('class', 'country-total-lab small mb-0')
            .html(function (d) {
                var badge = $(this).closest('.country-profile-row').get(0).__data__.is_open === '1'
                    ? openSkyBadge : '';
                return d[1] > 0
                    ? d[1] + ' за розкладами / видано прав на ' + d[0] +
                    ' <span title="рейсів на тиждень" data-toggle="tooltip" data-placement="bottom">р/т</span> ' +
                    badge
                    : 'видано прав на ' + d[0] +
                    ' <span title="рейсів на тиждень" data-toggle="tooltip" data-placement="bottom">р/т</span> ' +
                    badge;
            });
        $(function () {
            $('.country-total-lab [data-toggle="tooltip"]').tooltip()
        })

        $(document).ready( function () {
            $('div.country-profile-row').sort(function (a, b) {
                return d3.descending(
                    $(a).find('.country-total').get(0).__data__[0],
                    $(b).find('.country-total').get(0).__data__[0]
                );
            }).hide().appendTo('#table-body').slideDown(750);

            countryWidthRegular = $('#'+ maxWidthCountryName.encoutry + ' .country-name').width();
            $('.country-name').animate({
                width: countryWidthRegular
            }, 500);
        });

        var uncollapseCard = countryRows.append('div')
            .attr('class', 'col-1 uncollapse-card p-0 m-0 text-center')
            .attr('id', function (d) {
                return 'collapse-' + d.encoutry;
            })
            .append('a')
            .attr('data-toggle', 'collapse')
            .attr('href', function (d) {
                return '#collapse-card' + d.encoutry;
            })
            .attr('aria-expanded', 'false')
            .attr('aria-controls', function (d) {
                return 'collapse-card' + d.encoutry;
            })
            .append('i')
            .attr('class', 'fa fa-chevron-down')
            .style('font-weight', '200');

    };

    drawTable();

    //--------- CARD ---------------------------------------------------------------------------------------------------
    // Create collapsible div
    collapseCard = d3.selectAll('div.country-profile-row')
        .append('div')
        .attr('class', 'col-12 collapse mt-4')
        .attr('id', function (d) {
            return 'collapse-card' + d.encoutry;
        })
        .attr('role', 'tabpanel')
        .attr('aria-labelledby', function (d) {
            return 'collapse-' + d.encoutry;
        })
        .attr('data-parent', function (d) {
            return d.encoutry;
        });

    // ---------- Card rights to exploit the route -----------------------------------------------------------------
    var routePermissionsRow = collapseCard
        .filter(function (d) {  return computeCountryTotal(d)[0] > 0;  })
        .append('div')
        .attr('class', 'row permissions ');

    // Route permissions heading
    routePermissionsRow.append('div')
        .attr('class', 'col-12 mt-2 mb-4 permissions-heading')
        .html('Надані права на експлуатацію повітряних ліній,<br/>' +
            '<span class="small text-lowercase font-weight-normal">рейсів на тиждень (р/т)</span>');

    // ----- Draw small multiples of permissions. Include only selected airlines meet within country ---------------
    var drawPermissions = function () {
        // Define general data? padding, axis
        var selected_airlines = [];
        airlines_data.map(function (a) {
            if (!a.airline_removed) {
                selected_airlines.push(a.icao_iata.split('_')[0]);
            }
        });

        var permissionDivs = routePermissionsRow.selectAll('div.permission')
            .data(function (row) {
                var d = dataFilterAirline([JSON.parse(JSON.stringify(row))])[0];
                var permissions = [];
                var country_airlines = [];
                d.conditions.map(function (c) {
                    c.permissions.map(function (p) {
                        permissions.push(p);
                        p.rights.map(function (r) {
                            // adding airline to list/array if airline is selected and not already in list
                            if ((country_airlines.indexOf(r.icao_airline) < 0) &&
                                (selected_airlines.indexOf(r.icao_airline) > -1)) {
                                country_airlines.push(r.icao_airline);
                            }
                        })
                    });
                });

                // sort rights by total airline amount of permissions
                country_airlines = country_airlines.sort(function (a, b) {
                    var icaos = airline_icao_iata.map(function (codes) {
                        return codes.split('_')[0];
                    });
                    return d3.ascending(
                        icaos.indexOf(a),
                        icaos.indexOf(b)
                    );
                });

                // SVG height in em. 2 em for axis and padding
                var svgHeight = country_airlines.length + 3;

                permissions = permissions.sort(function (a, b) {
                    var totalRights = function (p) {
                        var total = [];
                        p.rights.map(function (r) {
                            total.push(+r.max_freq);
                        });
                        return d3.sum(total);
                    };
                    return d3.descending(totalRights(a), totalRights(b));
                });

                // D3 scales to attach x and y on-fly. **fly**, baby:)))
                var xScalePerm = d3.scaleLinear()
                    .domain([0, 22])
                    .range([0, 98])
                    .clamp(true);

                var yAirlineScalePoint = d3.scalePoint()
                    .domain(country_airlines)
                    .range([1, country_airlines.length * 10])
                    .align(0);

                // add scaled values and svg height to permission rights array
                permissions.map(function (p, i) {
                    p.rights.map(function (r, j) {
                        permissions[i].rights[j].y = yAirlineScalePoint(r.icao_airline);
                        permissions[i].rights[j].perm_width = xScalePerm(r.max_freq);
                        permissions[i].rights[j].flight_width = r.schedules ?
                            xScalePerm(r.schedules.freq) :
                            0;
                        // It is pervertion, but we store FUNCTION in js object! Axis function ... no other way;

                        permissions[i].axis_x_function = d3.axisBottom()
                            .scale(xScalePerm)
                            .tickValues(d3.range(xScalePerm.domain()[0], xScalePerm.domain()[1])
                                .filter(function (d, i) {
                                    return d % 7 == 0;
                                }))
                            .tickSize(2);

                        permissions[i].axis_y_function = d3.axisLeft()
                            .scale(yAirlineScalePoint)
                            .tickSize(2);
                        permissions[i]['svg_height'] = svgHeight;
                    });
                });
                return permissions;
            })
            .enter()
            .append('div')
            .attr('class', function (d) {
                var classes = ['col-lg-3', 'col-md-4', 'col-sm-6', 'col-8', 'mb-3', 'permission'];
                if ( d.is_occupied === 1 ) {  classes.push('is_occupied');  }
                return classes.join(' ');
            } )
            .attr('id', function (d) {
                return d.from_encity.replace(/[\.\s]/gi, '') + '__' + d.to_encity.replace(/[\.\s]/gi, '');
            });

        // Route header
        var routeHeaders = permissionDivs.append('div')
            .attr('class', 'route-header small pb-1')
            .html(function (d) {  return '<span>' + d.from_city + ' – ' + d.to_city + '</span>';  });

        routeHeaders.filter(function (d) {  return d.is_occupied === 1;  })
            .attr('title', 'Не залишилось вільних частот')
            .attr('data-toggle', 'occupied_tooltip')
            .attr('data-placement', 'bottom');

        $(function () {
            $('[data-toggle="occupied_tooltip"]').tooltip()
        });

        // fix shity long route names: Abracadabra-Smthland - Dgsgsgffdfhdhdrydrgrh
        routeHeaders.filter(function () {
            return this.textContent.length < 20;
        })
            .text(function () {
                return '\n' + this.textContent;
            });

        var permissionSVGs = permissionDivs.append('svg')
            .attr('width', '100%')
            // Count svg height
            .attr('height', function (d) {  return d.svg_height + 'em';  })
            .attr('viewBox', function (d) {  return '0, 0, 100, ' + d.svg_height * 10;  });

        // draw permission bars, same classes as in major bar. In need to style differently, add selector by div class
        var permissionBars = permissionSVGs.selectAll('rect.permission')
            .data(function (d) {  return d.rights;   })
            .enter()
            .append('rect')
            .attr('class', 'permission')
            .attr('x', 0)
            .attr('y', function (d) {  return d.y;  })
            .attr('height', 5)
            .attr('width', function (d) {
                return d.perm_width;
            });

        var permissionFlightBars = permissionSVGs.selectAll('rect.flight')
            .data(function (d) {  return d.rights;  })
            .enter()
            .append('rect')
            .attr('class', 'flight')
            .attr('x', 0)
            .attr('y', function (d) {  return d.y;  })
            .attr('height', 5)
            .attr('width', function (d) {  return d.flight_width;  });


        // Simple call on permissionSVGs does not work, so each
        d3.selectAll('div.permission svg')
            .each(function (svg) {
                d3.select(this)
                    .append('g')
                    .attr('class', 'frequency-axis-x')
                    .attr('transform', function (d) {
                        return 'translate(-2, ' + (d.svg_height * 10 - 18) + ')';
                    })
                    .call(svg.axis_x_function);

                d3.select(this)
                    .append('g')
                    .attr('class', 'airlines-axis-y')
                    .attr('transform', 'translate(0, 2.5)')
                    .call(svg.axis_y_function);
            });



        // add flights-per-week label
        permissionSVGs.filter(function (d) {
            return $(this).closest('.permissions').find('svg').index(this) == 0;
        })
            .append('text')
            .attr('class', 'flights-per-week-lab')
            .attr('x', '-24%')
            .attr('y', function (d) {
                return d.svg_height * 10 - 9;
            })
            .text('р/т');

        // --- Airline ICAO tooltip
        d3.selectAll('.airlines-axis-y g.tick text')
            .attr('class', 'airline-icao-tooltipped')
            .attr('title', function (d) {
                return airlines_data.filter(
                    function (a) {
                        return a.icao_iata.split('_')[0] == d;
                    })[0].airline_label;
            })
            .attr('data-toggle', 'airline-icao-tooltipped')
            .attr('data-placement', 'right');

        // Airline tooltip
        $(function () {
            $('[data-toggle="airline-icao-tooltipped"]').tooltip()
        });

        d3.selectAll('div.permissions rect')
            .classed('permission-bar-tooltipped', true)
            .attr('data-html', true);

        // Flight right tooltip
        $(function () {
            $('.permission-bar-tooltipped').tooltip({
                title: function () {
                    return this.__data__.schedules
                        ? 'до <strong>' + this.__data__.max_freq + '</strong> р/т,<br/>'
                        + 'здійснюють <strong>' + this.__data__.schedules.freq + '</strong>:<br/>'
                        + '<span class="flight-codes">' + this.__data__.schedules.flights + '</span>'
                        : 'до <strong>' + this.__data__.max_freq + '</strong> р/т';
                },
                placement: 'bottom'
            })
        });

        // Make airline label lighter, if there are no flights
        d3.selectAll('.airlines-axis-y g.tick text')
            .filter(function (a) {
                var rect_data = d3.select($(this).closest('svg').get(0))
                    .selectAll('rect.permission')
                    .data();
                var route_airlines = [];
                rect_data.map(function (d) {  route_airlines.push(d.icao_airline);  });

                return route_airlines.indexOf(a) < 0;
            })
            .classed('no-flights-airline-lab', true);
    };

    drawPermissions();




    // ---------- Table of treaty conditions -----------------------------------------------------------------------
    var treatyConditionsRow = collapseCard.append('div')
        .attr('class', 'row treaty');

    treatyConditionsRow.append('div')
        .attr('class', 'col-12 mt-3 mb-3 treaty-heading')
        .text(function (d) {
            return d.stage === 'проект'
                ? 'Умови розподілу рейсів у проекті угоди'
                : 'Умови розподілу рейсів за міжнародною угодою'
        });

    var treatyTableRow = treatyConditionsRow.selectAll('div.treaty-table-col-main')
        .data(function (d) {
            return d.conditions;
        })
        .enter()
        .append('div')
        .attr('class', 'col-12 treaty-table-col-main pb-4')
        .append('div')
        .attr('class', 'row no-gutters treaty-table-row pt-2')
        .attr('id', function (d) {
            return [
                d.en_from.replace(/[\.\s]/gi, ''),
                d.en_to.replace(/[\.\s]/gi, '')
            ].join('__');
        });

    var routes = treatyTableRow.append('div')
        .attr('class', 'col-md-3 col-sm-4 col-12 mr-5 mb-sm-0 mb-4 country-routes-diagram');

    var treatyFlightLimits = treatyTableRow.append('div')
        .attr('class', 'col-md-3 col-sm-4 col-12 mr-5 mb-sm-0 mb-4 treaty-flight-limits');

    var treatyAirlineLimits = treatyTableRow.append('div')
        .attr('class', 'col-md-4 col-sm-4 col-12 treaty-airline-limits');

    // Table headers
    routes.append('p')
        .attr('class', 'small limit-heading')
        .text('Маршрути');
    treatyFlightLimits.append('p')
        .attr('class', 'small limit-heading')
        .text('Частота рейсів');
    treatyAirlineLimits.append('p')
        .attr('class', 'small limit-heading')
        .text('Кількість авіакомпаній');

    var uaRouteList = routes.filter(function (d) {  return d.ua_from !== d.ua_to;  })
        .append('p')
        .attr('class', 'ua-points')
        .html(function (d) {
            return d.ua_from.split('--').join(', ');
        });

    var foreignRouteList = routes.filter(function (d) {  return d.ua_from !== d.ua_to;  })
        .selectAll('p.foreign-points')
        .data(function (d) {  return d.ua_to.split('--');  })
        .enter()
        .append('p')
        .attr('class', 'foreign-points')
        .html(function (d) {
            return '<i class="fa fa-plane"></i>' + ' ' + d;
        });

    var unlimitedRoutes = routes.filter(function (d) {  return d.ua_from === d.ua_to;  })
        .append('p')
        .attr('class', 'unlimited-points')
        .text('без обмежень');


    var freqLimits = treatyFlightLimits.selectAll('p.flight-limits-val')
        .data(function (d) {
            return d.limits.flights;
        })
        .enter()
        .append('p')
        .attr('class', function (d) {
            var classes = ['flight-lim', 'limits-val', 'small'];
            if (!d.scope) {  classes.push('unlimited-limit')  }
            return classes.join(' ');
        })
        .html(function (d) {
            var limit = d.limit === 999 ? 'необмежено' : d.limit;
            if (d.scope) {
                return limit === 'необмежено'
                    ? d.scope_text +
                    '<br/><span class="limit-figure unlimited">∞</span>'
                    : d.scope_text +
                    '<br/><span class="limit-figure">' + limit + '</span>' + ' р/т';

            } else {
                return 'без обмежень';
            }
        });

    var airlineLimits = treatyAirlineLimits.selectAll('p.airline-limits-val')
        .data(function (d) {
            return d.limits.airlines;
        })
        .enter()
        .append('p')
        .attr('class', function (d) {
            var classes = ['airline-lim', 'limits-val small'];
            if (!d.scope) {
                classes.push('unlimited-limit')
            }
            return classes.join(' ');
        })
        .html(function (d) {
            var limit = d.limit === 999 ? 'необмежено' : d.limit;
            if (d.scope) {
                return limit === 'необмежено'
                    ? d.scope_text +
                    '<br/><span class="limit-figure unlimited">∞</span>'
                    : d.scope_text +
                    '<br/><span class="limit-figure">' + limit + '</span>';

            } else {
                return 'без обмежень';
            }
        });

    var commentLine = treatyTableRow.filter(function (d) {  return d.comment != '';  })
        .append('div')
        .attr('class', 'col-12 treaty-comment small')
        .text(function (d) {  return d.comment;  });

    d3.selectAll('span.limit-figure.unlimited')
        .attr('title', 'необмежено');


    // uncollapse previously selected
    $('.collapse').on('show.bs.collapse', function () {
        $('.card-open div.collapse').collapse('hide');
    });

    // Change icon and add border to card on uncollapse
    $('.collapse').on('shown.bs.collapse', function () {
        $(document).ready(function () {
            var maxHHeight = 0;
            $('div.permission:visible div').each(function () {
                maxHHeight = maxHHeight > $(this).height() ? maxHHeight : $(this).height();
            }).each(function () {
                $(this).height(maxHHeight);
            });
        });

        d3.select(this.parentNode)
            .classed('card-open', true)
            .classed('already-viewed', true);

        d3.select(this.parentNode)
            .select('a i')
            .attr('class', 'fa fa-chevron-up');

        $('body').scrollTo($(this.parentNode), {
            offset: -$('nav#table-header').height() - 35,
            duration: 750
        });

        $('.card-open .country-name').animate({
            width: $('.card-open .country-name span').width()
        });
    });

    $('.collapse').on('hide.bs.collapse', function () {

        $('.card-open .country-name').animate({
            width: countryWidthRegular
        }, 750);

        d3.select(this.parentNode)
            .classed('card-open', false);

        d3.select(this.parentNode)
            .select('a i')
            .attr('class', 'fa fa-chevron-down');
    });

});


