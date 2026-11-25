"""Create the local app's compact ESS extract from an unmodified official CSV.

Usage: python3 scripts/import-ess.py /absolute/path/ESS11e04_2.csv
No account identifiers or credentials are stored in generated files.
"""
import csv
import hashlib
import json
import sys
from pathlib import Path

COUNTRIES = {
 'AT':'Австрия','BE':'Бельгия','BG':'Болгария','CH':'Швейцария',
 'CY':'Кипр','CZ':'Чехия','DE':'Германия','EE':'Эстония','ES':'Испания',
 'FI':'Финляндия','FR':'Франция','GB':'Великобритания','GR':'Греция',
 'HR':'Хорватия','HU':'Венгрия','IE':'Ирландия','IL':'Израиль','IS':'Исландия',
 'IT':'Италия','LT':'Литва','LV':'Латвия','ME':'Черногория','NL':'Нидерланды',
 'NO':'Норвегия','PL':'Польша','PT':'Португалия','RS':'Сербия','SE':'Швеция',
 'SI':'Словения','SK':'Словакия','UA':'Украина','DK':'Дания','RO':'Румыния',
}
FIELDS=['idno','agea','lrscale','gincdif','impcntr','freehms','wrclmch','pspwght','ccnthum','gndr','hmsacld','euftf','imdfetn','trstprl','psppipla','vote','imbgeco','imueclt','lrnobed','loylead','eqparep','fineqpy','stfdem','ppltrst','ipudrsta']

def number(value):
    if value is None or value.strip() in ('','NA','NaN'): return None
    n=float(value)
    return int(n) if n.is_integer() else n

def convert(path):
    countries={}
    editions=set()
    production=set()
    max_age=80
    with path.open(newline='',encoding='utf-8-sig') as source:
        reader=csv.DictReader(source)
        required=set(FIELDS+['cntry','edition','proddate','inwds','inwde','pweight','anweight'])
        if not required.issubset(reader.fieldnames):
            raise ValueError(f'Missing ESS columns: {required-set(reader.fieldnames)}')
        for row in reader:
            if None in row.values(): raise ValueError('Incomplete CSV record (download may be truncated)')
            code=row['cntry']
            if code not in COUNTRIES: raise ValueError(f'Country needs a display name: {code}')
            population_weight=number(row['pweight'])
            if population_weight is None or population_weight<=0:raise ValueError(f'Missing population weight: {code}')
            country=countries.setdefault(code,{'name':COUNTRIES[code],'years':set(),'populationWeight':population_weight,'rows':[]})
            if country['populationWeight']!=population_weight:raise ValueError(f'Population weight varies within {code}')
            parsed=[number(row[field]) for field in FIELDS]
            analysis_weight=number(row['anweight'])
            if parsed[7] is not None and analysis_weight is not None and abs(parsed[7]*population_weight-analysis_weight)>1e-10:
                raise ValueError(f'Analysis weight does not match pspwght × pweight in {code}')
            country['rows'].append(parsed)
            for field in ['inwds','inwde']:
                year=row[field][:4]
                if year.isdigit() and 2020<=int(year)<=2026:country['years'].add(int(year))
            age=parsed[1]
            if age is not None and 15<=age<=110:max_age=max(max_age,age)
            editions.add(row['edition']);production.add(row['proddate'])
    if editions!={'4.2'}:raise ValueError(f'Unexpected editions: {editions}')
    for code,country in countries.items():
        ids=[r[0] for r in country['rows']]
        if len(ids)!=len(set(ids)):raise ValueError(f'Duplicate IDs in {code}')
        country['years']=sorted(country['years'])
        country['rows'].sort(key=lambda row:row[0])
    return {'source':{'title':'Adapted from ESS Round 11, version 4.2',
      'doi':'https://doi.org/10.21338/ess11e04_2',
      'license':'CC BY-NC-SA 4.0','weight':'pspwght within countries; pspwght × pweight for EU aggregation (verified against anweight)',
      'productionDate':sorted(production),'rawSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
      'fields':FIELDS,'countryFields':['pweight'],'transform':'Selected columns only; original response codes and weights retained. Russian display labels and question groupings added.'},
      'ageMax':max_age,'countries':dict(sorted(countries.items()))}

if __name__=='__main__':
    data=convert(Path(sys.argv[1]))
    dest=Path(__file__).resolve().parents[1]/'data/ess11.json'
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(json.dumps({'countries':len(data['countries']),'respondents':sum(len(c['rows']) for c in data['countries'].values()),'ageMax':data['ageMax'],'bytes':dest.stat().st_size,'inventory':{code:{'n':len(c['rows']),'years':c['years']} for code,c in data['countries'].items()}},ensure_ascii=False,indent=2))
