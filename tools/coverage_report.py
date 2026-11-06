#!/usr/bin/env python3
"""Merge browser runs from the same generated executable, retaining evidence.

Execution is not correctness. Scenario checks establish only their named
observations; they do not validate every block touched by that scenario.
"""
import argparse
import json
from pathlib import Path


def merge(manifest, reports):
    functions, blocks, unimplemented = set(), set(), set()
    scenarios, manipulations, runs = [], [], []
    allowed_functions, allowed_blocks = set(manifest['functions']), set(manifest['blocks'])
    for report in reports:
        if report.get('schema') != 1 or report['generation'] != manifest['generation'] or report['profile'] != manifest['profile']:
            raise ValueError('Coverage reports must match the manifest generation and executable profile')
        f, b = set(report['executedFunctions']), set(report['executedBlocks'])
        if not f <= allowed_functions or not b <= allowed_blocks:
            raise ValueError('Report contains addresses outside the coverage inventory')
        functions |= f; blocks |= b
        unimplemented.update(report['unimplementedImports'])
        # Old experimental exports parsed resource slots without RES_HEAD.
        # Retain their execution/check evidence but discard unreliable labels.
        scenarios.extend({**s,'com':s['com'] if report.get('comMapping') == 2 else [],
                          'build':report.get('build')} for s in report['scenarios'])
        manipulations.extend(report.get('manipulations',[]))
        runs.append({k:report.get(k) for k in ['captured','browser','pending','summary','build','comMapping']})
    def totals(hit, available):
        return {'executed':len(hit), 'discovered':len(available), 'percent':round(100*len(hit)/len(available),2) if available else 0}
    all_functions = allowed_functions | set(manifest.get('uninstrumentedFunctions',[]))
    return {'schema':1, 'generation':manifest['generation'], 'profile':manifest['profile'],
            'denominator':manifest['denominator'], 'functions':totals(functions,all_functions),
            'blocks':totals(blocks,allowed_blocks), 'runs':runs,
            'checkedScenarios':sum(bool(s['verified']) for s in scenarios),
            'scenarios':scenarios, 'manipulations':manipulations,
            'unexecutedFunctions':sorted(all_functions-functions),
            'unexecutedBlocks':sorted(allowed_blocks-blocks),
            'uninstrumentedFunctions':manifest.get('uninstrumentedFunctions',[]),
            'liftFailures':manifest.get('liftFailures',[]), 'trapSites':manifest['trapSites'],
            'unimplementedImports':sorted(unimplemented)}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reports',nargs='+',type=Path)
    parser.add_argument('--manifest',type=Path,default=Path('gen/nfsu1/coverage.json'))
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    result=merge(json.loads(args.manifest.read_text()),[json.loads(p.read_text()) for p in args.reports])
    args.output.write_text(json.dumps(result,indent=2)+'\n')
    for name in ['functions','blocks']:
        item=result[name]; print(f"{name}: {item['executed']}/{item['discovered']} executed ({item['percent']}%)")
    print(f"Scenarios: {result['checkedScenarios']}/{len(result['scenarios'])} passed their explicit checks")
    print(f"Uninstrumented functions: {len(result['uninstrumentedFunctions'])}; trap candidates: {len(result['trapSites'])}")
    print(f"Unimplemented imports observed: {len(result['unimplementedImports'])}")
    print('Discovered code is an incomplete inventory; execution is not proof of correctness.')


if __name__ == '__main__': main()
