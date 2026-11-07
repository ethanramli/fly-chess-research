from pathlib import Path
p=Path('python actions/overnight_reader_status.py');s=p.read_text().replace('mark=json.dumps(rec,sort_keys=True)', "mark=json.dumps({'state':state,'progress':prog},sort_keys=True)");p.write_text(s)
